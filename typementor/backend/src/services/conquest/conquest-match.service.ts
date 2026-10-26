import { PrismaClient } from '@prisma/client';
import {
  ConquestMatchStatus,
  PersistedGridState,
  PlayerSlot,
  PublicConquestMatch,
  PublicConquestParticipant,
  TerritoryCell,
  AttackSubmissionResult,
  ActiveAttackChallenge,
} from './conquest.types';
import {
  generateConquestMap,
  GRID_SIZE,
  TOTAL_CELLS,
} from './conquest-map.service';
import { ConquestCombatService } from './conquest-combat.service';

export class ConquestMatchService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generates a collision-resistant 6-character uppercase alphanumeric code (e.g. "CQ7A92").
   */
  private generateMatchCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Creates a new Word Conquest match, initializes the deterministic 6x6 board,
   * and seats the creator as Player 1 (Blue, Top-Left at 0,0).
   */
  async createMatch(
    creatorId: string,
    options: {
      mapSeed?: string;
      idempotencyKey?: string;
    } = {}
  ): Promise<PublicConquestMatch> {
    // 1. Clean up or reject conflicting active/waiting matches for creator
    const existingParticipation = await this.prisma.conquestParticipant.findFirst({
      where: {
        userId: creatorId,
        match: {
          status: { in: ['WAITING', 'READY', 'ACTIVE'] },
        },
      },
      include: {
        match: {
          include: { participants: true },
        },
      },
    });

    if (existingParticipation) {
      const activeMatch = existingParticipation.match;
      // Auto-cancel solitary waiting match created by this user
      if (activeMatch.status === 'WAITING' && activeMatch.creatorId === creatorId) {
        await this.prisma.conquestMatch.update({
          where: { id: activeMatch.id },
          data: { status: 'CANCELLED' },
        });
      } else if (activeMatch.status === 'ACTIVE' || activeMatch.status === 'READY') {
        throw new Error('You are already participating in an active or ready Word Conquest match.');
      }
    }

    // 2. Generate unique match code
    let matchCode = this.generateMatchCode();
    for (let i = 0; i < 5; i++) {
      const existing = await this.prisma.conquestMatch.findUnique({ where: { matchCode } });
      if (!existing) break;
      matchCode = this.generateMatchCode();
    }

    const seed =
      options.mapSeed && options.mapSeed.trim().length > 0
        ? options.mapSeed.trim()
        : `cq_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 3. Generate initial deterministic 6x6 board
    const initialMap = generateConquestMap(seed);
    const initialGridState: PersistedGridState = {
      cells: initialMap.cellMap,
      activeChallenges: {},
      completedChallengeIds: [],
    };

    // 4. Create match and seat creator atomically
    const match = await this.prisma.$transaction(async (tx) => {
      const created = await tx.conquestMatch.create({
        data: {
          matchCode,
          creatorId,
          status: 'WAITING',
          mapSeed: seed,
          gridState: JSON.stringify(initialGridState),
          currentTurn: 1,
        },
      });

      // Seat 1 = Player 1 (Blue Capital at 0,0)
      await tx.conquestParticipant.create({
        data: {
          matchId: created.id,
          userId: creatorId,
          seat: 1,
          isReady: true, // Creator is ready by default
          territoriesCount: 1,
        },
      });

      return created;
    });

    return this.getMatchDetails(match.id, creatorId);
  }

  /**
   * Joins an existing waiting match. Seats joiner as Player 2 (Red, Bottom-Right at 5,5)
   * and transitions state to READY.
   */
  async joinMatch(userId: string, matchCodeOrId: string): Promise<PublicConquestMatch> {
    const cleanQuery = matchCodeOrId.trim();

    const match = await this.prisma.conquestMatch.findFirst({
      where: {
        OR: [{ matchCode: cleanQuery.toUpperCase() }, { id: cleanQuery }],
      },
      include: {
        participants: true,
      },
    });

    if (!match) {
      throw new Error('Word Conquest match not found. Please verify the match code.');
    }

    if (match.status !== 'WAITING') {
      throw new Error(`This match is already ${match.status.toLowerCase()} and cannot be joined.`);
    }

    if (match.creatorId === userId) {
      throw new Error('You cannot join your own match as an opponent.');
    }

    if (match.participants.length >= 2) {
      throw new Error('This match already has two participants.');
    }

    // Seat Player 2 atomically and transition to READY
    await this.prisma.$transaction(async (tx) => {
      await tx.conquestParticipant.create({
        data: {
          matchId: match.id,
          userId,
          seat: 2,
          isReady: false,
          territoriesCount: 1,
        },
      });

      await tx.conquestMatch.update({
        where: { id: match.id },
        data: { status: 'READY' },
      });
    });

    return this.getMatchDetails(match.id, userId);
  }

  /**
   * Toggles or marks player readiness. Transitions match to ACTIVE when both players are ready.
   */
  async setPlayerReady(
    matchId: string,
    userId: string
  ): Promise<{ match: PublicConquestMatch; isAllReady: boolean }> {
    const participant = await this.prisma.conquestParticipant.findUnique({
      where: { matchId_userId: { matchId, userId } },
    });

    if (!participant) {
      throw new Error('Participant not found in this match.');
    }

    await this.prisma.conquestParticipant.update({
      where: { id: participant.id },
      data: { isReady: true },
    });

    const allParticipants = await this.prisma.conquestParticipant.findMany({
      where: { matchId },
    });

    const isAllReady = allParticipants.length === 2 && allParticipants.every((p) => p.isReady);

    if (isAllReady) {
      await this.prisma.conquestMatch.update({
        where: { id: matchId },
        data: {
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      });
    }

    const updated = await this.getMatchDetails(matchId, userId);
    return { match: updated, isAllReady };
  }

  /**
   * Retrieves sanitized, fully assembled match details and board state.
   */
  async getMatchDetails(
    matchId: string,
    requestingUserId?: string
  ): Promise<PublicConquestMatch> {
    const match = await this.prisma.conquestMatch.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, level: true },
            },
          },
          orderBy: { seat: 'asc' },
        },
      },
    });

    if (!match) {
      throw new Error(`Word Conquest match "${matchId}" not found.`);
    }

    // Parse persisted grid state or regenerate if missing
    let gridState: PersistedGridState;
    if (match.gridState) {
      try {
        gridState = JSON.parse(match.gridState);
      } catch {
        const freshMap = generateConquestMap(match.mapSeed);
        gridState = {
          cells: freshMap.cellMap,
          activeChallenges: {},
          completedChallengeIds: [],
        };
      }
    } else {
      const freshMap = generateConquestMap(match.mapSeed);
      gridState = {
        cells: freshMap.cellMap,
        activeChallenges: {},
        completedChallengeIds: [],
      };
    }

    const initialMap = generateConquestMap(match.mapSeed);

    // Compute authoritative territory counts directly from persisted grid cells
    let p1TerritoryCount = 0;
    let p2TerritoryCount = 0;
    if (gridState && gridState.cells) {
      for (const cell of Object.values(gridState.cells)) {
        if (cell.owner === 1) p1TerritoryCount++;
        else if (cell.owner === 2) p2TerritoryCount++;
      }
    }

    const publicParticipants: PublicConquestParticipant[] = match.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      seat: p.seat,
      isReady: p.isReady,
      isConnected: p.isConnected,
      territoriesCount:
        p.seat === 1
          ? Math.max(1, p1TerritoryCount)
          : Math.max(1, p2TerritoryCount),
      outcome: p.outcome,
      user: p.user,
    }));

    const activeChallenge = requestingUserId
      ? gridState.activeChallenges[requestingUserId] || null
      : null;

    return {
      id: match.id,
      matchCode: match.matchCode,
      creatorId: match.creatorId,
      status: match.status as ConquestMatchStatus,
      mapSeed: match.mapSeed,
      currentTurn: match.currentTurn,
      winnerId: match.winnerId,
      startedAt: match.startedAt ? match.startedAt.toISOString() : null,
      finishedAt: match.finishedAt ? match.finishedAt.toISOString() : null,
      createdAt: match.createdAt.toISOString(),
      participants: publicParticipants,
      board: {
        gridSize: GRID_SIZE,
        totalCells: TOTAL_CELLS,
        cells: Object.values(gridState.cells),
        cellMap: gridState.cells,
        capitals: initialMap.capitals,
        fortresses: initialMap.fortresses,
      },
      activeChallenge,
    };
  }

  /**
   * Persists the authoritative results of a successful territory capture atomically.
   */
  async recordTerritoryCapture(
    matchId: string,
    userId: string,
    result: AttackSubmissionResult
  ): Promise<PublicConquestMatch> {
    const updatedMatch = await this.prisma.$transaction(async (tx) => {
      const currentMatch = await tx.conquestMatch.findUniqueOrThrow({
        where: { id: matchId },
        include: { participants: true },
      });

      if (currentMatch.status !== 'ACTIVE') {
        throw new Error('Cannot record capture: match is not in ACTIVE state.');
      }

      // Count territories owned by each player
      let p1Count = 0;
      let p2Count = 0;
      for (const cell of Object.values(result.gridState.cells)) {
        if (cell.owner === 1) p1Count++;
        else if (cell.owner === 2) p2Count++;
      }

      const p1 = currentMatch.participants.find((p) => p.seat === 1);
      const p2 = currentMatch.participants.find((p) => p.seat === 2);

      if (p1) {
        await tx.conquestParticipant.update({
          where: { id: p1.id },
          data: { territoriesCount: p1Count },
        });
      }

      if (p2) {
        await tx.conquestParticipant.update({
          where: { id: p2.id },
          data: { territoriesCount: p2Count },
        });
      }

      // If capital capture: match ends immediately!
      if (result.isCapitalCapture && result.winnerId) {
        const winnerId = result.winnerId;
        const loser = currentMatch.participants.find((p) => p.userId !== winnerId);

        await tx.conquestParticipant.updateMany({
          where: { matchId, userId: winnerId },
          data: { outcome: 'WIN' },
        });

        if (loser) {
          await tx.conquestParticipant.updateMany({
            where: { matchId, userId: loser.userId },
            data: { outcome: 'LOSS' },
          });
        }

        return await tx.conquestMatch.update({
          where: { id: matchId },
          data: {
            status: 'FINISHED',
            winnerId,
            finishedAt: new Date(),
            gridState: JSON.stringify(result.gridState),
          },
        });
      }

      // Standard territory capture
      return await tx.conquestMatch.update({
        where: { id: matchId },
        data: {
          gridState: JSON.stringify(result.gridState),
        },
      });
    });

    return this.getMatchDetails(updatedMatch.id, userId);
  }

  /**
   * Forfeits match on prolonged disconnect (>30s) and awards win to remaining opponent.
   */
  async forfeitMatchOnDisconnect(
    matchId: string,
    disconnectedUserId: string
  ): Promise<PublicConquestMatch | null> {
    const match = await this.prisma.conquestMatch.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });

    if (!match || match.status !== 'ACTIVE') {
      return null;
    }

    const opponent = match.participants.find((p) => p.userId !== disconnectedUserId);
    if (!opponent) {
      return null;
    }

    await this.prisma.$transaction(async (tx) => {
      // Mark disconnected player as ABANDONED
      await tx.conquestParticipant.updateMany({
        where: { matchId, userId: disconnectedUserId },
        data: { outcome: 'ABANDONED', isConnected: false },
      });

      // Mark opponent as WIN
      await tx.conquestParticipant.updateMany({
        where: { matchId, userId: opponent.userId },
        data: { outcome: 'WIN' },
      });

      await tx.conquestMatch.update({
        where: { id: matchId },
        data: {
          status: 'FINISHED',
          winnerId: opponent.userId,
          finishedAt: new Date(),
        },
      });
    });

    return this.getMatchDetails(matchId, opponent.userId);
  }

  /**
   * Cancels a waiting match safely.
   */
  async cancelMatch(matchId: string, userId: string): Promise<PublicConquestMatch> {
    const match = await this.prisma.conquestMatch.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });

    if (!match) throw new Error('Match not found.');
    if (match.status !== 'WAITING') {
      throw new Error(`Cannot cancel match in ${match.status} status.`);
    }
    if (match.creatorId !== userId) {
      throw new Error('Only the match creator can cancel this match.');
    }

    await this.prisma.conquestMatch.update({
      where: { id: matchId },
      data: { status: 'CANCELLED' },
    });

    return this.getMatchDetails(matchId, userId);
  }

  /**
   * Finds any active/waiting match the user is currently participating in.
   */
  async getActiveMatchForUser(userId: string): Promise<PublicConquestMatch | null> {
    const participation = await this.prisma.conquestParticipant.findFirst({
      where: {
        userId,
        match: {
          status: { in: ['WAITING', 'READY', 'ACTIVE'] },
        },
      },
      include: {
        match: true,
      },
    });

    if (!participation) return null;
    return this.getMatchDetails(participation.matchId, userId);
  }

  /**
   * Concurrency-safe atomic attack initiation using PostgreSQL row locking.
   * Acquires a row lock on ConquestMatch, deserializes fresh gridState,
   * validates targeting and state transitions, and persists the new active challenge.
   */
  async startAttackAtomically(
    matchId: string,
    userId: string,
    targetRow: number,
    targetCol: number,
    now: number = Date.now()
  ): Promise<{ challenge: ActiveAttackChallenge; updatedGridState: PersistedGridState }> {
    return await this.prisma.$transaction(async (tx) => {
      // Row-level lock for PostgreSQL concurrency isolation
      try {
        await tx.$executeRaw`SELECT id FROM "ConquestMatch" WHERE id = ${matchId} FOR UPDATE`;
      } catch {
        // Fallback for mock/test environments
      }

      const match = await tx.conquestMatch.findUnique({
        where: { id: matchId },
        include: { participants: true },
      });

      if (!match || match.status !== 'ACTIVE') {
        throw new Error('Match is not in ACTIVE state.');
      }

      const participant = match.participants.find((p) => p.userId === userId);
      if (!participant) {
        throw new Error('Participant not found.');
      }

      const playerSlot = participant.seat as PlayerSlot;
      const currentGridState: PersistedGridState = JSON.parse(match.gridState || '{}');

      const { challenge, updatedGridState } = ConquestCombatService.initiateAttack({
        matchId,
        userId,
        playerSlot,
        targetRow,
        targetCol,
        currentGridState,
        matchSeed: match.mapSeed,
        currentTurn: match.currentTurn,
        now,
      });

      await tx.conquestMatch.update({
        where: { id: matchId },
        data: { gridState: JSON.stringify(updatedGridState) },
      });

      return { challenge, updatedGridState };
    });
  }

  /**
   * Concurrency-safe atomic challenge submission using PostgreSQL row locking.
   * Serializes simultaneous submissions, preventing lost captures, duplicate winners,
   * or overwritten gridState.
   */
  async submitChallengeAtomically(
    matchId: string,
    userId: string,
    challengeId: string,
    submittedText: string,
    now: number = Date.now()
  ): Promise<{
    result: AttackSubmissionResult;
    updatedMatch?: PublicConquestMatch;
  }> {
    const { result, updatedMatchRecord } = await this.prisma.$transaction(async (tx) => {
      // Acquire PostgreSQL row lock on match row
      try {
        await tx.$executeRaw`SELECT id FROM "ConquestMatch" WHERE id = ${matchId} FOR UPDATE`;
      } catch {
        // Fallback for mock/test environments
      }

      const match = await tx.conquestMatch.findUnique({
        where: { id: matchId },
        include: { participants: true },
      });

      if (!match || match.status !== 'ACTIVE') {
        throw new Error('Match is not in ACTIVE state.');
      }

      const currentGridState: PersistedGridState = JSON.parse(match.gridState || '{}');

      const subResult = ConquestCombatService.submitChallenge({
        userId,
        challengeId,
        submittedText: submittedText || '',
        currentGridState,
        now,
      });

      if (!subResult.success) {
        // Persist cleared challenge state (cleared from activeChallenges)
        await tx.conquestMatch.update({
          where: { id: matchId },
          data: { gridState: JSON.stringify(subResult.gridState) },
        });
        return { result: subResult, updatedMatchRecord: null };
      }

      // Successful capture! Count territories
      let p1Count = 0;
      let p2Count = 0;
      for (const cell of Object.values(subResult.gridState.cells)) {
        if (cell.owner === 1) p1Count++;
        else if (cell.owner === 2) p2Count++;
      }

      const p1 = match.participants.find((p) => p.seat === 1);
      const p2 = match.participants.find((p) => p.seat === 2);

      if (p1) {
        await tx.conquestParticipant.update({
          where: { id: p1.id },
          data: { territoriesCount: p1Count },
        });
      }

      if (p2) {
        await tx.conquestParticipant.update({
          where: { id: p2.id },
          data: { territoriesCount: p2Count },
        });
      }

      // Check capital victory
      if (subResult.isCapitalCapture && subResult.winnerId) {
        const winnerId = subResult.winnerId;
        const loser = match.participants.find((p) => p.userId !== winnerId);

        await tx.conquestParticipant.updateMany({
          where: { matchId, userId: winnerId },
          data: { outcome: 'WIN' },
        });

        if (loser) {
          await tx.conquestParticipant.updateMany({
            where: { matchId, userId: loser.userId },
            data: { outcome: 'LOSS' },
          });
        }

        const terminalMatch = await tx.conquestMatch.update({
          where: { id: matchId },
          data: {
            status: 'FINISHED',
            winnerId,
            finishedAt: new Date(now),
            gridState: JSON.stringify(subResult.gridState),
          },
        });

        return { result: subResult, updatedMatchRecord: terminalMatch };
      }

      // Standard territory capture
      const updatedMatch = await tx.conquestMatch.update({
        where: { id: matchId },
        data: {
          gridState: JSON.stringify(subResult.gridState),
        },
      });

      return { result: subResult, updatedMatchRecord: updatedMatch };
    });

    if (!result.success || !updatedMatchRecord) {
      return { result };
    }

    const publicMatch = await this.getMatchDetails(matchId, userId);
    return { result, updatedMatch: publicMatch };
  }

  /**
   * Reconciles orphan/stuck matches on server boot and periodic interval.
   * Cancels WAITING matches older than 30 minutes and ACTIVE matches older than 2 hours.
   */
  async reconcileStaleMatches(): Promise<{ cancelledWaiting: number; cancelledActive: number }> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const staleWaiting = await this.prisma.conquestMatch.updateMany({
      where: {
        status: 'WAITING',
        createdAt: { lt: thirtyMinutesAgo },
      },
      data: { status: 'CANCELLED' },
    });

    const staleActive = await this.prisma.conquestMatch.updateMany({
      where: {
        status: { in: ['READY', 'ACTIVE'] },
        updatedAt: { lt: twoHoursAgo },
      },
      data: { status: 'CANCELLED' },
    });

    if (staleWaiting.count > 0 || staleActive.count > 0) {
      console.log(
        `[Conquest Reconcile] Cancelled ${staleWaiting.count} stale WAITING matches and ${staleActive.count} abandoned ACTIVE matches.`
      );
    }

    return {
      cancelledWaiting: staleWaiting.count,
      cancelledActive: staleActive.count,
    };
  }
}
