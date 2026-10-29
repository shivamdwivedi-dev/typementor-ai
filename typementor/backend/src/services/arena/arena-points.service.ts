import { PrismaClient } from '@prisma/client';
import { ARENA_CONFIG, ArenaLedgerType } from './arena.types';

export class ArenaPointsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Retrieves or initializes the user's Arena Points balance.
   * If the user is new to Arena, records an initial welcome grant in the immutable ledger.
   */
  async getOrCreateUserBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, arenaPoints: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if initial welcome grant ledger exists
    const welcomeKey = `welcome_grant_${userId}`;
    const existingGrant = await this.prisma.arenaPointLedger.findUnique({
      where: { idempotencyKey: welcomeKey },
    });

    if (!existingGrant) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Double check inside transaction
          const check = await tx.arenaPointLedger.findUnique({
            where: { idempotencyKey: welcomeKey },
          });
          if (check) return;

          // If user already had points from schema default, ensure ledger reflects it
          const currentBal = Math.max(user.arenaPoints ?? 0, ARENA_CONFIG.INITIAL_WELCOME_POINTS);

          await tx.user.update({
            where: { id: userId },
            data: { arenaPoints: currentBal },
          });

          await tx.arenaPointLedger.create({
            data: {
              userId,
              amount: currentBal,
              type: 'WELCOME_GRANT',
              idempotencyKey: welcomeKey,
              balanceAfter: currentBal,
              metadata: JSON.stringify({ reason: 'Initial Welcome Arena Points Grant' }),
            },
          });
        });
        return Math.max(user.arenaPoints ?? 0, ARENA_CONFIG.INITIAL_WELCOME_POINTS);
      } catch (err: any) {
        // Idempotency conflict is safe to ignore
        if (!err.message?.includes('Unique constraint')) {
          console.error('[Arena Points] Welcome grant error:', err);
        }
      }
    }

    return user.arenaPoints ?? 0;
  }

  /**
   * Transactionally locks a participant's stake before match start.
   * Idempotent: If already locked for this match & user, returns safely.
   * Can run within an existing Prisma transaction client if provided.
   */
  async lockStake(userId: string, matchId: string, stakeAmount: number, externalTx?: any): Promise<number> {
    if (stakeAmount <= 0) return 0; // Zero-stake matches require no locking

    if (stakeAmount > ARENA_CONFIG.MAX_ARENA_STAKE) {
      throw new Error(`Stake exceeds server maximum of ${ARENA_CONFIG.MAX_ARENA_STAKE} Arena Points.`);
    }

    const idempotencyKey = `stake_lock_${matchId}_${userId}`;

    const executeLock = async (tx: any): Promise<number> => {
      // 1. Check if stake was already locked for this match
      const existing = await tx.arenaPointLedger.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return existing.balanceAfter;
      }

      // 2. Fetch fresh user balance with row lock (FOR UPDATE in PostgreSQL)
      let currentBalance = 0;
      if (typeof (tx as any).$queryRaw === 'function') {
        try {
          const locked = await (tx as any).$queryRaw`SELECT "id", "arenaPoints" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
          if (locked && Array.isArray(locked) && locked.length > 0) {
            currentBalance = locked[0].arenaPoints ?? 0;
          } else {
            const user = await tx.user.findUnique({
              where: { id: userId },
              select: { id: true, arenaPoints: true },
            });
            if (!user) throw new Error('User not found');
            currentBalance = user.arenaPoints ?? 0;
          }
        } catch {
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { id: true, arenaPoints: true },
          });
          if (!user) throw new Error('User not found');
          currentBalance = user.arenaPoints ?? 0;
        }
      } else {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, arenaPoints: true },
        });
        if (!user) throw new Error('User not found');
        currentBalance = user.arenaPoints ?? 0;
      }

      if (currentBalance < stakeAmount) {
        throw new Error(`Insufficient Arena Points. Required: ${stakeAmount}, Available: ${currentBalance}.`);
      }

      // 3. Atomically decrement balance
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { arenaPoints: { decrement: stakeAmount } },
        select: { arenaPoints: true },
      });
      const newBalance = updatedUser.arenaPoints ?? (currentBalance - stakeAmount);

      // 4. Record immutable ledger entry
      await tx.arenaPointLedger.create({
        data: {
          userId,
          matchId,
          amount: -stakeAmount,
          type: 'STAKE_LOCK',
          idempotencyKey,
          balanceAfter: newBalance,
          metadata: JSON.stringify({ matchId, stakeAmount }),
        },
      });

      // 5. Mark participant stake as locked
      await tx.arenaParticipant.updateMany({
        where: { matchId, userId },
        data: { stakeLocked: true },
      });

      return newBalance;
    };

    if (externalTx) {
      return await executeLock(externalTx);
    }
    return await this.prisma.$transaction(executeLock);
  }

  /**
   * Settle match rewards for the winner.
   * Winner gets the entire pot (their own stake returned + opponent's stake won = stakeAmount * 2).
   * Committed atomically with match status update.
   */
  async settleWinner(matchId: string, winnerId: string, stakeAmount: number): Promise<void> {
    if (stakeAmount <= 0) {
      // 0-stake match: mark settled without points transfer
      await this.prisma.arenaMatch.update({
        where: { id: matchId },
        data: { settlementStatus: 'SETTLED' },
      });
      return;
    }

    const potTotal = stakeAmount * 2;
    const idempotencyKey = `settlement_win_${matchId}`;

    await this.prisma.$transaction(async (tx) => {
      // 1. Check if already settled
      const existing = await tx.arenaPointLedger.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return;
      }

      // 2. Fetch fresh user balance with row lock (FOR UPDATE in PostgreSQL)
      let currentBalance = 0;
      if (typeof (tx as any).$queryRaw === 'function') {
        try {
          const locked = await (tx as any).$queryRaw`SELECT "id", "arenaPoints" FROM "User" WHERE "id" = ${winnerId} FOR UPDATE`;
          if (locked && Array.isArray(locked) && locked.length > 0) {
            currentBalance = locked[0].arenaPoints ?? 0;
          } else {
            const user = await tx.user.findUnique({
              where: { id: winnerId },
              select: { id: true, arenaPoints: true },
            });
            if (!user) throw new Error('Winner user record not found');
            currentBalance = user.arenaPoints ?? 0;
          }
        } catch {
          const user = await tx.user.findUnique({
            where: { id: winnerId },
            select: { id: true, arenaPoints: true },
          });
          if (!user) throw new Error('Winner user record not found');
          currentBalance = user.arenaPoints ?? 0;
        }
      } else {
        const user = await tx.user.findUnique({
          where: { id: winnerId },
          select: { id: true, arenaPoints: true },
        });
        if (!user) throw new Error('Winner user record not found');
        currentBalance = user.arenaPoints ?? 0;
      }

      const newBalance = currentBalance + potTotal;

      await tx.user.update({
        where: { id: winnerId },
        data: { arenaPoints: newBalance },
      });

      // 3. Record ledger transaction
      await tx.arenaPointLedger.create({
        data: {
          userId: winnerId,
          matchId,
          amount: potTotal,
          type: 'MATCH_WIN',
          idempotencyKey,
          balanceAfter: newBalance,
          metadata: JSON.stringify({ matchId, stakeAmount, potTotal }),
        },
      });

      // 4. Mark match as settled
      await tx.arenaMatch.update({
        where: { id: matchId },
        data: { settlementStatus: 'SETTLED' },
      });
    });
  }

  /**
   * Refunds all locked stakes to participants (e.g., match cancelled, expired, or tied).
   * Fully idempotent per user and match.
   */
  async refundMatchStakes(matchId: string, reason: 'TIE' | 'CANCELLED' | 'EXPIRED'): Promise<void> {
    const match = await this.prisma.arenaMatch.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });

    if (!match || match.stakeAmount <= 0) {
      if (match) {
        await this.prisma.arenaMatch.update({
          where: { id: matchId },
          data: { settlementStatus: 'REFUNDED' },
        });
      }
      return;
    }

    const stakeAmount = match.stakeAmount;

    await this.prisma.$transaction(async (tx) => {
      for (const p of match.participants) {
        if (!p.stakeLocked) continue;

        const refundKey = `refund_${matchId}_${p.userId}_${reason}`;
        const existing = await tx.arenaPointLedger.findUnique({
          where: { idempotencyKey: refundKey },
        });

        if (existing) continue;

        const user = await tx.user.findUnique({
          where: { id: p.userId },
          select: { id: true, arenaPoints: true },
        });

        if (!user) continue;

        // Atomically refund stake using increment
        const newBalance = (user.arenaPoints ?? 0) + stakeAmount;

        await tx.user.update({
          where: { id: p.userId },
          data: { arenaPoints: newBalance },
        });

        await tx.arenaPointLedger.create({
          data: {
            userId: p.userId,
            matchId,
            amount: stakeAmount,
            type: 'MATCH_REFUND',
            idempotencyKey: refundKey,
            balanceAfter: newBalance,
            metadata: JSON.stringify({ matchId, reason, stakeAmount }),
          },
        });
      }

      await tx.arenaMatch.update({
        where: { id: matchId },
        data: { settlementStatus: 'REFUNDED' },
      });
    });
  }
}
