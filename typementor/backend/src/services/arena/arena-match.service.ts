import { PrismaClient } from '@prisma/client';
import { ARENA_CONFIG, ArenaMatchStatus, PublicArenaMatch, MatchHistoryItem } from './arena.types';
import { ArenaPointsService } from './arena-points.service';
import { getRandomArenaPassage, getPassageById } from './passages';

export class ArenaMatchService {
  constructor(
    private prisma: PrismaClient,
    private pointsService: ArenaPointsService
  ) {}

  /**
   * Generates a collision-resistant 6-character uppercase alphanumeric code (e.g. "ARN782").
   */
  private generateMatchCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars (0, O, 1, I)
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Creates an invite-based friendly match with optional stake and selected passage.
   */
  async createMatch(
    creatorId: string,
    options: {
      stakeAmount?: number;
      passageCategory?: string;
      passageId?: string;
      idempotencyKey?: string;
    }
  ): Promise<PublicArenaMatch> {
    const stakeAmount = Math.max(0, Math.floor(options.stakeAmount ?? 0));

    if (stakeAmount > ARENA_CONFIG.MAX_ARENA_STAKE) {
      throw new Error(`Maximum stake allowed is ${ARENA_CONFIG.MAX_ARENA_STAKE} Arena Points.`);
    }

    // 1. Verify creator point balance if stake > 0
    if (stakeAmount > 0) {
      const balance = await this.pointsService.getOrCreateUserBalance(creatorId);
      if (balance < stakeAmount) {
        throw new Error(`Insufficient Arena Points balance. Required: ${stakeAmount}, Current: ${balance}.`);
      }
    }

    // 2. Prevent creating conflicting active matches, auto-cleaning stale/solitary waiting matches
    const activeParticipation = await this.prisma.arenaParticipant.findFirst({
      where: {
        userId: creatorId,
        match: {
          status: { in: ['WAITING', 'READY', 'COUNTDOWN', 'ACTIVE'] },
        },
      },
      include: {
        match: {
          include: { participants: true },
        },
      },
    });

    if (activeParticipation) {
      const activeMatch = activeParticipation.match;
      const isExpired = activeMatch.expiresAt && activeMatch.expiresAt.getTime() < Date.now();
      const isLoneWaiting = activeMatch.status === 'WAITING' && activeMatch.participants.length <= 1;

      // If the existing match is expired OR is an unjoined WAITING match created by this user, auto-cancel it safely
      if (isExpired || (isLoneWaiting && activeMatch.creatorId === creatorId)) {
        await this.prisma.arenaMatch.update({
          where: { id: activeMatch.id },
          data: {
            status: 'CANCELLED',
            cancellationReason: isExpired ? 'Expired before new match creation' : 'Replaced by creator with new match',
          },
        });
        await this.pointsService.refundMatchStakes(activeMatch.id, 'CANCELLED');
      } else {
        throw new Error('You are already participating in an active or waiting Arena match. Complete or cancel it first.');
      }
    }

    // 3. Resolve passage
    const passage = options.passageId
      ? getPassageById(options.passageId) || getRandomArenaPassage(options.passageCategory)
      : getRandomArenaPassage(options.passageCategory);

    // 4. Generate unique match code
    let matchCode = this.generateMatchCode();
    for (let attempts = 0; attempts < 5; attempts++) {
      const existing = await this.prisma.arenaMatch.findUnique({ where: { matchCode } });
      if (!existing) break;
      matchCode = this.generateMatchCode();
    }

    const expiresAt = new Date(Date.now() + ARENA_CONFIG.WAITING_MATCH_EXPIRATION_MS);

    // 5. Create match and seat creator atomically
    const match = await this.prisma.$transaction(async (tx) => {
      // Check idempotency if provided
      if (options.idempotencyKey) {
        const existing = await tx.arenaMatch.findUnique({
          where: { idempotencyKey: options.idempotencyKey },
          include: {
            creator: true,
            participants: { include: { user: true } },
          },
        });
        if (existing) {
          return existing;
        }
      }

      const createdMatch = await tx.arenaMatch.create({
        data: {
          matchCode,
          creatorId,
          status: 'WAITING',
          passageId: passage.id,
          passageText: passage.text,
          passageTitle: passage.title,
          passageWordCount: passage.wordCount,
          stakeAmount,
          isRanked: stakeAmount > 0,
          expiresAt,
          idempotencyKey: options.idempotencyKey || null,
        },
      });

      // Seat creator
      await tx.arenaParticipant.create({
        data: {
          matchId: createdMatch.id,
          userId: creatorId,
          seat: 1,
          isReady: true, // Creator is ready by default
        },
      });

      // Atomically lock creator stake within transaction if wagered
      if (stakeAmount > 0) {
        await this.pointsService.lockStake(creatorId, createdMatch.id, stakeAmount, tx);
      }

      return await tx.arenaMatch.findUniqueOrThrow({
        where: { id: createdMatch.id },
        include: {
          creator: true,
          participants: { include: { user: true } },
        },
      });
    });

    return this.formatPublicMatch(match, creatorId);
  }

  /**
   * Joins an existing waiting match. Atomically locks the joiner's stake and transitions state to READY.
   */
  async joinMatch(
    userId: string,
    matchCodeOrId: string,
    idempotencyKey?: string
  ): Promise<PublicArenaMatch> {
    const cleanQuery = matchCodeOrId.trim();

    // 1. Locate match by code or UUID
    const match = await this.prisma.arenaMatch.findFirst({
      where: {
        OR: [
          { matchCode: cleanQuery.toUpperCase() },
          { id: cleanQuery },
        ],
      },
      include: {
        participants: { include: { user: true } },
      },
    });

    if (!match) {
      throw new Error('Arena match not found. Please verify the 6-character match code.');
    }

    // 2. Validate join eligibility
    if (match.status !== 'WAITING') {
      throw new Error(`This match is already ${match.status.toLowerCase()} and cannot be joined.`);
    }

    if (match.creatorId === userId) {
      throw new Error('You cannot join your own match as an opponent.');
    }

    if (match.participants.length >= 2) {
      throw new Error('This match already has two participants.');
    }

    if (match.expiresAt && match.expiresAt.getTime() < Date.now()) {
      throw new Error('This match invitation has expired.');
    }

    // 3. Verify user has sufficient points
    if (match.stakeAmount > 0) {
      const balance = await this.pointsService.getOrCreateUserBalance(userId);
      if (balance < match.stakeAmount) {
        throw new Error(`Insufficient Arena Points. Required stake: ${match.stakeAmount}, Your balance: ${balance}.`);
      }
    }

    // 4. Verify user is not in another active match
    const activeMatch = await this.prisma.arenaParticipant.findFirst({
      where: {
        userId,
        matchId: { not: match.id },
        match: {
          status: { in: ['WAITING', 'READY', 'COUNTDOWN', 'ACTIVE'] },
        },
      },
    });

    if (activeMatch) {
      throw new Error('You are already participating in another active Arena match.');
    }

    // 5. Atomically seat participant and lock status
    const updated = await this.prisma.$transaction(async (tx) => {
      // Re-check status inside transaction to prevent join race conditions
      const current = await tx.arenaMatch.findUnique({
        where: { id: match.id },
        include: { participants: true },
      });

      if (!current || current.status !== 'WAITING' || current.participants.length >= 2) {
        throw new Error('Match is no longer available to join.');
      }

      await tx.arenaParticipant.create({
        data: {
          matchId: match.id,
          userId,
          seat: 2,
          isReady: false,
        },
      });

      // Atomically lock joining player's stake inside transaction
      if (match.stakeAmount > 0) {
        await this.pointsService.lockStake(userId, match.id, match.stakeAmount, tx);
      }

      return await tx.arenaMatch.update({
        where: { id: match.id },
        data: {
          status: 'READY',
          joinedAt: new Date(),
        },
        include: {
          creator: true,
          participants: { include: { user: true } },
        },
      });
    });

    return this.formatPublicMatch(updated, userId);
  }

  /**
   * Cancels a waiting match and refunds all locked stakes.
   */
  async cancelMatch(userId: string, matchId: string, reason = 'Cancelled by creator'): Promise<void> {
    const match = await this.prisma.arenaMatch.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });

    if (!match) throw new Error('Match not found.');

    if (match.creatorId !== userId) {
      throw new Error('Only the match creator can cancel this match.');
    }

    if (!['WAITING', 'READY'].includes(match.status)) {
      throw new Error(`Cannot cancel a match in ${match.status} state.`);
    }

    await this.prisma.arenaMatch.update({
      where: { id: matchId },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason,
      },
    });

    await this.pointsService.refundMatchStakes(matchId, 'CANCELLED');
  }

  /**
   * Retrieves the current active, waiting, ready, or countdown match for a user (if any).
   * Automatically resolves/expires stale waiting matches.
   */
  async getActiveMatch(userId: string): Promise<PublicArenaMatch | null> {
    const participation = await this.prisma.arenaParticipant.findFirst({
      where: {
        userId,
        match: {
          status: { in: ['WAITING', 'READY', 'COUNTDOWN', 'ACTIVE'] },
        },
      },
      include: {
        match: {
          include: {
            creator: true,
            participants: { include: { user: true } },
          },
        },
      },
    });

    if (!participation) return null;

    const match = participation.match;

    // Auto-expire stale waiting matches
    if (match.status === 'WAITING' && match.expiresAt && match.expiresAt.getTime() < Date.now()) {
      await this.prisma.arenaMatch.update({
        where: { id: match.id },
        data: { status: 'EXPIRED', cancellationReason: 'Invitation expired' },
      });
      await this.pointsService.refundMatchStakes(match.id, 'EXPIRED');
      return null;
    }

    return this.formatPublicMatch(match, userId);
  }

  /**
   * Retrieves match details with security masking (passage text only exposed once active/finished).
   */
  async getMatchDetails(matchIdOrCode: string, requestingUserId: string): Promise<PublicArenaMatch> {
    const clean = matchIdOrCode.trim();
    const match = await this.prisma.arenaMatch.findFirst({
      where: {
        OR: [
          { matchCode: clean.toUpperCase() },
          { id: clean },
        ],
      },
      include: {
        creator: true,
        participants: { include: { user: true } },
      },
    });

    if (!match) throw new Error('Match not found.');

    return this.formatPublicMatch(match, requestingUserId);
  }

  /**
   * Lists open, waiting matches available to be joined.
   */
  async getOpenWaitingMatches(requestingUserId: string, limit = 10): Promise<PublicArenaMatch[]> {
    const matches = await this.prisma.arenaMatch.findMany({
      where: {
        status: 'WAITING',
        creatorId: { not: requestingUserId },
        expiresAt: { gt: new Date() },
      },
      include: {
        creator: true,
        participants: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return matches.map((m) => this.formatPublicMatch(m, requestingUserId));
  }

  /**
   * Retrieves paginated match history for the user.
   */
  async getUserMatchHistory(userId: string, limit = 10, offset = 0): Promise<{ history: MatchHistoryItem[]; total: number }> {
    const [participations, total] = await Promise.all([
      this.prisma.arenaParticipant.findMany({
        where: {
          userId,
          match: { status: { in: ['FINISHED', 'CANCELLED'] } },
        },
        include: {
          match: {
            include: {
              participants: {
                include: {
                  user: { select: { id: true, name: true, avatar: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.arenaParticipant.count({
        where: {
          userId,
          match: { status: { in: ['FINISHED', 'CANCELLED'] } },
        },
      }),
    ]);

    const history: MatchHistoryItem[] = participations.map((p) => {
      const match = p.match;
      const opponent = match.participants.find((op) => op.userId !== userId);
      const isWinner = match.winnerId === userId;
      const isTie = match.isTie;
      const pointsDelta = isWinner
        ? match.stakeAmount
        : isTie || match.status === 'CANCELLED'
        ? 0
        : -match.stakeAmount;

      return {
        id: match.id,
        matchCode: match.matchCode,
        status: match.status as ArenaMatchStatus,
        passageTitle: match.passageTitle,
        stakeAmount: match.stakeAmount,
        playedAt: match.finishedAt?.toISOString() || match.createdAt.toISOString(),
        myWpm: p.wpm,
        myAccuracy: p.accuracy,
        myOutcome: p.outcome || (isWinner ? 'WIN' : isTie ? 'TIE' : 'LOSS'),
        pointsDelta,
        opponentName: opponent?.user.name || 'Anonymous Opponent',
        opponentWpm: opponent?.wpm || 0,
        opponentAccuracy: opponent?.accuracy || 0,
      };
    });

    return { history, total };
  }

  /**
   * Database-backed lifecycle reconciliation for server crash/restart recovery (Audit D).
   * Automatically expires stale waiting invitations and resolves overdue active matches.
   */
  async reconcileStaleMatches(): Promise<{ expiredWaiting: number; overdueActive: number }> {
    const now = new Date();
    let expiredWaiting = 0;
    let overdueActive = 0;

    // 1. Expire waiting matches whose expiration time has passed
    const staleWaitingMatches = await this.prisma.arenaMatch.findMany({
      where: {
        status: 'WAITING',
        expiresAt: { lte: now },
      },
      include: { participants: true },
    });

    for (const match of staleWaitingMatches) {
      try {
        await this.prisma.arenaMatch.update({
          where: { id: match.id },
          data: {
            status: 'EXPIRED',
            cancellationReason: 'Match invitation expired with no opponent joining',
          },
        });
        if (match.stakeAmount > 0) {
          await this.pointsService.refundMatchStakes(match.id, 'EXPIRED');
        }
        expiredWaiting++;
      } catch (err: any) {
        console.warn(`[Arena Recovery] Failed to expire waiting match ${match.id}:`, err.message);
      }
    }

    // 2. Resolve active matches that exceeded maxDuration + 30s grace without completion
    const overdueActiveMatches = await this.prisma.arenaMatch.findMany({
      where: {
        status: 'ACTIVE',
        startedAt: {
          lte: new Date(now.getTime() - (ARENA_CONFIG.DEFAULT_MAX_DURATION_SECONDS + 30) * 1000),
        },
      },
      include: { participants: true },
    });

    for (const match of overdueActiveMatches) {
      try {
        const [p1, p2] = match.participants;
        let winnerId: string | null = null;
        let isTie = false;

        if (p1 && p2) {
          if (p1.progressPercent > p2.progressPercent) {
            winnerId = p1.userId;
          } else if (p2.progressPercent > p1.progressPercent) {
            winnerId = p2.userId;
          } else if (p1.wpm > p2.wpm) {
            winnerId = p1.userId;
          } else if (p2.wpm > p1.wpm) {
            winnerId = p2.userId;
          } else {
            isTie = true;
          }
        } else if (p1) {
          winnerId = p1.userId;
        }

        await this.prisma.arenaMatch.update({
          where: { id: match.id },
          data: {
            status: 'FINISHED',
            winnerId,
            isTie,
            finishedAt: now,
          },
        });

        if (isTie) {
          await this.pointsService.refundMatchStakes(match.id, 'TIE');
        } else if (winnerId) {
          await this.pointsService.settleWinner(match.id, winnerId, match.stakeAmount);
        }
        overdueActive++;
      } catch (err: any) {
        console.warn(`[Arena Recovery] Failed to resolve overdue active match ${match.id}:`, err.message);
      }
    }

    return { expiredWaiting, overdueActive };
  }

  /**
   * Sanitizes match data for public API exposure.
   */
  private formatPublicMatch(match: any, requestingUserId: string): PublicArenaMatch {
    const isParticipant = match.participants.some((p: any) => p.userId === requestingUserId);
    const exposePassage = ['ACTIVE', 'FINISHED'].includes(match.status);

    return {
      id: match.id,
      matchCode: match.matchCode,
      creatorId: match.creatorId,
      status: match.status as ArenaMatchStatus,
      passageTitle: match.passageTitle,
      passageWordCount: match.passageWordCount,
      stakeAmount: match.stakeAmount,
      isRanked: match.isRanked,
      maxDuration: match.maxDuration,
      countdownSeconds: match.countdownSeconds,
      winnerId: match.winnerId,
      isTie: match.isTie,
      settlementStatus: match.settlementStatus,
      cancellationReason: match.cancellationReason,
      createdAt: match.createdAt.toISOString(),
      joinedAt: match.joinedAt?.toISOString() || null,
      startedAt: match.startedAt?.toISOString() || null,
      finishedAt: match.finishedAt?.toISOString() || null,
      expiresAt: match.expiresAt?.toISOString() || null,
      passageText: exposePassage ? match.passageText : undefined,
      participants: match.participants.map((p: any) => ({
        userId: p.userId,
        name: p.user?.name || 'Anonymous',
        avatar: p.user?.avatar || null,
        seat: p.seat,
        isReady: p.isReady,
        isConnected: p.isConnected,
        progressPercent: p.progressPercent,
        charsTyped: p.charsTyped,
        wpm: p.wpm,
        accuracy: p.accuracy,
        completionTimeMs: p.completionTimeMs ?? null,
        outcome: p.outcome,
      })),
    };
  }
}
