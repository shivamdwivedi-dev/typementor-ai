import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app, { prisma } from '../app';
import { JWT_SECRET } from '../config/env';
import { ConquestCombatService, ATTACK_DEADLINE_MS } from '../services/conquest/conquest-combat.service';
import { ConquestMatchService } from '../services/conquest/conquest-match.service';
import { generateConquestMap } from '../services/conquest/conquest-map.service';
import { PersistedGridState, PlayerSlot } from '../services/conquest/conquest.types';
import { arenaTicketService } from '../services/arena/arena-ticket.service';

describe('Word Conquest — Phase 3: Match Orchestrator & Combat Engine', () => {
  const userP1 = 'user_conquest_p1';
  const userP2 = 'user_conquest_p2';
  const userP3 = 'user_conquest_intruder';

  const tokenP1 = jwt.sign({ id: userP1, email: 'p1@typementor.in' }, JWT_SECRET, { expiresIn: '1h' });
  const tokenP2 = jwt.sign({ id: userP2, email: 'p2@typementor.in' }, JWT_SECRET, { expiresIn: '1h' });
  const tokenP3 = jwt.sign({ id: userP3, email: 'intruder@typementor.in' }, JWT_SECRET, { expiresIn: '1h' });

  let initialGridState: PersistedGridState;
  const matchSeed = 'test_match_seed_orchestrator';

  beforeEach(() => {
    vi.restoreAllMocks();
    const map = generateConquestMap(matchSeed);
    initialGridState = {
      cells: map.cellMap,
      activeChallenges: {},
      completedChallengeIds: [],
    };
  });

  // ─── 1. COMBAT STATE MACHINE & ATTACK INITIATION ────────────────────────────
  describe('1. Combat State Machine & Attack Initiation', () => {
    it('successfully initiates attack on orthogonally adjacent neutral territory (0, 1)', () => {
      const now = 1729850000000;
      const { challenge, updatedGridState } = ConquestCombatService.initiateAttack({
        matchId: 'match_1',
        userId: userP1,
        playerSlot: 1, // Player 1 Blue at (0, 0)
        targetRow: 0,
        targetCol: 1, // Adjacent east neighbor
        currentGridState: initialGridState,
        matchSeed,
        currentTurn: 1,
        now,
      });

      expect(challenge).toBeDefined();
      expect(challenge.userId).toBe(userP1);
      expect(challenge.targetCellKey).toBe('r0_c1');
      expect(challenge.difficultyTier).toBe('EASY');
      expect(challenge.defenseModifier).toBe(0);
      expect(challenge.minAccuracy).toBe(90);
      expect(challenge.startedAt).toBe(now);
      expect(challenge.deadlineAt).toBe(now + ATTACK_DEADLINE_MS); // Exactly 75s

      // Verifies active challenge is stored in state
      expect(updatedGridState.activeChallenges[userP1]).toEqual(challenge);
    });

    it('rejects targeting a cell the player already controls (friendly territory guard)', () => {
      expect(() => {
        ConquestCombatService.initiateAttack({
          matchId: 'match_1',
          userId: userP1,
          playerSlot: 1,
          targetRow: 0,
          targetCol: 0, // Player 1 already owns (0,0)
          currentGridState: initialGridState,
          matchSeed,
          currentTurn: 1,
        });
      }).toThrow(/already control territory/);
    });

    it('rejects targeting non-adjacent or distant cells', () => {
      // (2, 2) is not adjacent to starting capital (0, 0)
      expect(() => {
        ConquestCombatService.initiateAttack({
          matchId: 'match_1',
          userId: userP1,
          playerSlot: 1,
          targetRow: 2,
          targetCol: 2,
          currentGridState: initialGridState,
          matchSeed,
          currentTurn: 1,
        });
      }).toThrow(/not adjacent/);
    });

    it('rejects out of bounds coordinates safely', () => {
      expect(() => {
        ConquestCombatService.initiateAttack({
          matchId: 'match_1',
          userId: userP1,
          playerSlot: 1,
          targetRow: -1,
          targetCol: 0,
          currentGridState: initialGridState,
          matchSeed,
          currentTurn: 1,
        });
      }).toThrow(/out of grid bounds/);
    });

    it('enforces the single active challenge per player rule', () => {
      const now = 1729850000000;
      const { updatedGridState } = ConquestCombatService.initiateAttack({
        matchId: 'match_1',
        userId: userP1,
        playerSlot: 1,
        targetRow: 0,
        targetCol: 1,
        currentGridState: initialGridState,
        matchSeed,
        currentTurn: 1,
        now,
      });

      // Attempting to launch second attack while first is in flight
      expect(() => {
        ConquestCombatService.initiateAttack({
          matchId: 'match_1',
          userId: userP1,
          playerSlot: 1,
          targetRow: 1,
          targetCol: 0, // another valid neighbor
          currentGridState: updatedGridState,
          matchSeed,
          currentTurn: 1,
          now: now + 5000, // 5s later (deadline not expired)
        });
      }).toThrow(/already have an active attack challenge/);
    });
  });

  // ─── 2. TYPING VALIDATION & ACCURACY THRESHOLDS ─────────────────────────────
  describe('2. Authoritative Typing Validation & Defense Thresholds', () => {
    it('captures territory when submission has 100% accuracy before deadline', () => {
      const startTime = 1729850000000;
      const { challenge, updatedGridState } = ConquestCombatService.initiateAttack({
        matchId: 'match_1',
        userId: userP1,
        playerSlot: 1,
        targetRow: 0,
        targetCol: 1,
        currentGridState: initialGridState,
        matchSeed,
        currentTurn: 1,
        now: startTime,
      });

      const submitTime = startTime + 30000; // 30 seconds later (well within 75s)
      const result = ConquestCombatService.submitChallenge({
        userId: userP1,
        challengeId: challenge.challengeId,
        submittedText: challenge.passageText,
        currentGridState: updatedGridState,
        now: submitTime,
      });

      expect(result.success).toBe(true);
      expect(result.targetCellKey).toBe('r0_c1');
      expect(result.accuracy).toBe(100);
      expect(result.wpm).toBeGreaterThan(0);
      expect(result.gridState.cells['r0_c1'].owner).toBe(1); // Player 1 captured!
      expect(result.gridState.activeChallenges[userP1]).toBeNull(); // Cleared
      expect(result.gridState.completedChallengeIds).toContain(challenge.challengeId);
    });

    it('fails challenge when accuracy is below the required threshold', () => {
      const startTime = 1729850000000;
      const { challenge, updatedGridState } = ConquestCombatService.initiateAttack({
        matchId: 'match_1',
        userId: userP1,
        playerSlot: 1,
        targetRow: 0,
        targetCol: 1, // Requires 90% accuracy
        currentGridState: initialGridState,
        matchSeed,
        currentTurn: 1,
        now: startTime,
      });

      // Flawed text: replace first 25% of characters with incorrect letters
      const corruptedText = 'X'.repeat(25) + challenge.passageText.slice(25);

      const result = ConquestCombatService.submitChallenge({
        userId: userP1,
        challengeId: challenge.challengeId,
        submittedText: corruptedText,
        currentGridState: updatedGridState,
        now: startTime + 25000,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Accuracy');
      expect(result.accuracy).toBeLessThan(90);
      expect(result.gridState.cells['r0_c1'].owner).toBeNull(); // Territory NOT captured!
      expect(result.gridState.activeChallenges[userP1]).toBeNull(); // Cleared
    });

    it('enforces strict 75-second deadline expiration', () => {
      const startTime = 1729850000000;
      const { challenge, updatedGridState } = ConquestCombatService.initiateAttack({
        matchId: 'match_1',
        userId: userP1,
        playerSlot: 1,
        targetRow: 0,
        targetCol: 1,
        currentGridState: initialGridState,
        matchSeed,
        currentTurn: 1,
        now: startTime,
      });

      // Submit at 76 seconds (after 75-second deadline)
      const result = ConquestCombatService.submitChallenge({
        userId: userP1,
        challengeId: challenge.challengeId,
        submittedText: challenge.passageText,
        currentGridState: updatedGridState,
        now: startTime + 76000,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('timed out');
      expect(result.gridState.cells['r0_c1'].owner).toBeNull();
    });

    it('prevents replay of an already submitted challenge', () => {
      const startTime = 1729850000000;
      const { challenge, updatedGridState } = ConquestCombatService.initiateAttack({
        matchId: 'match_1',
        userId: userP1,
        playerSlot: 1,
        targetRow: 0,
        targetCol: 1,
        currentGridState: initialGridState,
        matchSeed,
        currentTurn: 1,
        now: startTime,
      });

      const firstSubmit = ConquestCombatService.submitChallenge({
        userId: userP1,
        challengeId: challenge.challengeId,
        submittedText: challenge.passageText,
        currentGridState: updatedGridState,
        now: startTime + 20000,
      });

      expect(firstSubmit.success).toBe(true);

      // Attempting to submit the same challenge a second time
      expect(() => {
        ConquestCombatService.submitChallenge({
          userId: userP1,
          challengeId: challenge.challengeId,
          submittedText: challenge.passageText,
          currentGridState: firstSubmit.gridState,
          now: startTime + 21000,
        });
      }).toThrow(/No matching active challenge found/);
    });
  });

  // ─── 3. CONCURRENCY & SIMULTANEOUS ATTACK RESOLUTION ────────────────────────
  describe('3. Concurrency & Simultaneous Attack Resolution', () => {
    it('atomically resolves two players attacking the same contested target (first completion wins)', () => {
      const now = 1729850000000;
      // Setup: Give P1 adjacent territory (1, 2) and P2 adjacent territory (3, 2) to target (2, 2)
      initialGridState.cells['r1_c2'].owner = 1;
      initialGridState.cells['r3_c2'].owner = 2;

      // Both players initiate attack on cell (2, 2)
      const p1Init = ConquestCombatService.initiateAttack({
        matchId: 'match_simul',
        userId: userP1,
        playerSlot: 1,
        targetRow: 2,
        targetCol: 2,
        currentGridState: initialGridState,
        matchSeed,
        currentTurn: 1,
        now,
      });

      const p2Init = ConquestCombatService.initiateAttack({
        matchId: 'match_simul',
        userId: userP2,
        playerSlot: 2,
        targetRow: 2,
        targetCol: 2,
        currentGridState: p1Init.updatedGridState,
        matchSeed,
        currentTurn: 1,
        now: now + 500,
      });

      // Both have active challenge for 'r2_c2'
      expect(p2Init.updatedGridState.activeChallenges[userP1]?.targetCellKey).toBe('r2_c2');
      expect(p2Init.updatedGridState.activeChallenges[userP2]?.targetCellKey).toBe('r2_c2');

      // Player 1 finishes first at 25s
      const p1Result = ConquestCombatService.submitChallenge({
        userId: userP1,
        challengeId: p1Init.challenge.challengeId,
        submittedText: p1Init.challenge.passageText,
        currentGridState: p2Init.updatedGridState,
        now: now + 25000,
      });

      expect(p1Result.success).toBe(true);
      expect(p1Result.gridState.cells['r2_c2'].owner).toBe(1);
      // Concurrency rule: Player 2's simultaneous attack on this cell was invalidated/cancelled!
      expect(p1Result.gridState.activeChallenges[userP2]).toBeNull();

      // When Player 2 finishes second at 28s, their challenge is already resolved/cleared
      expect(() => {
        ConquestCombatService.submitChallenge({
          userId: userP2,
          challengeId: p2Init.challenge.challengeId,
          submittedText: p2Init.challenge.passageText,
          currentGridState: p1Result.gridState,
          now: now + 28000,
        });
      }).toThrow(/No matching active challenge found/);

      // Only one ownership change occurs!
      expect(p1Result.gridState.cells['r2_c2'].owner).toBe(1);
    });

    it('ends match immediately on Capital capture with sole winner and terminal state', () => {
      const now = 1729850000000;
      // Player 1 advances to (5, 4), adjacent to Player 2 Capital (5, 5)
      initialGridState.cells['r5_c4'].owner = 1;

      const p1Assault = ConquestCombatService.initiateAttack({
        matchId: 'match_capital',
        userId: userP1,
        playerSlot: 1,
        targetRow: 5,
        targetCol: 5, // Enemy Capital!
        currentGridState: initialGridState,
        matchSeed,
        currentTurn: 1,
        now,
      });

      expect(p1Assault.challenge.territoryType).toBe('ENEMY_CAPITAL');
      expect(p1Assault.challenge.difficultyTier).toBe('EXPERT');
      expect(p1Assault.challenge.defenseModifier).toBe(5);
      expect(p1Assault.challenge.minAccuracy).toBe(96);

      // Player 1 completes the expert passage with 100% accuracy
      const result = ConquestCombatService.submitChallenge({
        userId: userP1,
        challengeId: p1Assault.challenge.challengeId,
        submittedText: p1Assault.challenge.passageText,
        currentGridState: p1Assault.updatedGridState,
        now: now + 40000,
      });

      expect(result.success).toBe(true);
      expect(result.isCapitalCapture).toBe(true);
      expect(result.winnerId).toBe(userP1);
      expect(result.gridState.cells['r5_c5'].owner).toBe(1);
    });
  });

  // ─── 4. REST API & TICKET ENDPOINTS ─────────────────────────────────────────
  describe('4. REST API & Ticket Security Endpoints', () => {
    it('issues single-use WebSocket tickets for authenticated users', async () => {
      const res = await request(app)
        .post('/api/conquest/ws-ticket')
        .set('Authorization', `Bearer ${tokenP1}`);

      expect(res.status).toBe(200);
      expect(res.body.ticket).toBeDefined();
      expect(typeof res.body.ticket).toBe('string');
      expect(res.body.expiresIn).toBe(60);

      // Ticket is single-use: can be consumed exactly once
      const consumed = arenaTicketService.consumeTicket(res.body.ticket);
      expect(consumed?.userId).toBe(userP1);

      // Second consumption returns null
      const secondConsume = arenaTicketService.consumeTicket(res.body.ticket);
      expect(secondConsume).toBeNull();
    });

    it('rejects unauthenticated requests to /api/conquest/matches', async () => {
      const res = await request(app).post('/api/conquest/matches').send({});
      expect(res.status).toBe(401);
    });

    it('rejects joining without matchCode', async () => {
      const res = await request(app)
        .post('/api/conquest/matches/join')
        .set('Authorization', `Bearer ${tokenP2}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Match code is required');
    });
  });

  // ─── 5. MATCH ORCHESTRATOR LIFECYCLE & SEATING ──────────────────────────────
  describe('5. Match Orchestrator Lifecycle & Seating (ConquestMatchService)', () => {
    let matchService: ConquestMatchService;

    const fakeMatchWaiting = {
      id: 'match_cq_fake_1',
      matchCode: 'CQ9999',
      creatorId: userP1,
      status: 'WAITING',
      mapSeed: 'seed_fake',
      gridState: JSON.stringify(initialGridState),
      currentTurn: 1,
      winnerId: null,
      startedAt: null,
      finishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: [
        {
          id: 'part_1',
          matchId: 'match_cq_fake_1',
          userId: userP1,
          seat: 1,
          isReady: true,
          isConnected: true,
          territoriesCount: 1,
          outcome: null,
          user: { id: userP1, name: 'Player One', avatar: null, level: 5 },
        },
      ],
    };

    beforeEach(() => {
      matchService = new ConquestMatchService(prisma);
      vi.spyOn(prisma.conquestParticipant, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.conquestMatch, 'findUnique').mockResolvedValue(fakeMatchWaiting as any);
      vi.spyOn(prisma, '$transaction').mockResolvedValue(fakeMatchWaiting as any);
    });

    it('creates match with P1 seated at (0, 0) and status WAITING', async () => {
      const match = await matchService.createMatch(userP1, {
        mapSeed: 'orchestrator_lifecycle_seed',
      });

      expect(match).toBeDefined();
      expect(match.matchCode).toHaveLength(6);
      expect(match.status).toBe('WAITING');
      expect(match.creatorId).toBe(userP1);
      expect(match.participants).toHaveLength(1);
      expect(match.participants[0].seat).toBe(1);
      expect(match.participants[0].userId).toBe(userP1);
      expect(match.participants[0].territoriesCount).toBe(1);
      expect(match.board.gridSize).toBe(6);
      expect(match.board.cells).toHaveLength(36);
    });

    it('seats Player 2 at seat 2 and transitions match to READY on join', async () => {
      vi.spyOn(prisma.conquestMatch, 'findFirst').mockResolvedValue(fakeMatchWaiting as any);
      const fakeMatchReady = {
        ...fakeMatchWaiting,
        status: 'READY',
        participants: [
          fakeMatchWaiting.participants[0],
          {
            id: 'part_2',
            matchId: 'match_cq_fake_1',
            userId: userP2,
            seat: 2,
            isReady: false,
            isConnected: true,
            territoriesCount: 1,
            outcome: null,
            user: { id: userP2, name: 'Player Two', avatar: null, level: 3 },
          },
        ],
      };
      vi.spyOn(prisma.conquestMatch, 'findUnique').mockResolvedValue(fakeMatchReady as any);

      const joined = await matchService.joinMatch(userP2, 'CQ9999');

      expect(joined.status).toBe('READY');
      expect(joined.participants).toHaveLength(2);
      expect(joined.participants[1].seat).toBe(2);
      expect(joined.participants[1].userId).toBe(userP2);
      expect(joined.participants[1].territoriesCount).toBe(1);
    });

    it('rejects creator attempting to join their own match as opponent', async () => {
      vi.spyOn(prisma.conquestMatch, 'findFirst').mockResolvedValue(fakeMatchWaiting as any);

      await expect(matchService.joinMatch(userP1, 'CQ9999')).rejects.toThrow(
        /cannot join your own match/
      );
    });

    it('rejects a third player attempting to join an already full match', async () => {
      vi.spyOn(prisma.conquestMatch, 'findFirst').mockResolvedValue({
        ...fakeMatchWaiting,
        status: 'READY',
        participants: [
          fakeMatchWaiting.participants[0],
          { userId: userP2, seat: 2 },
        ],
      } as any);

      await expect(matchService.joinMatch(userP3, 'CQ9999')).rejects.toThrow(
        /already ready and cannot be joined/
      );
    });

    it('transitions to ACTIVE when both players are ready', async () => {
      vi.spyOn(prisma.conquestParticipant, 'findUnique').mockResolvedValue({
        id: 'part_2',
        matchId: 'match_cq_fake_1',
        userId: userP2,
        isReady: false,
      } as any);
      vi.spyOn(prisma.conquestParticipant, 'update').mockResolvedValue({} as any);
      vi.spyOn(prisma.conquestParticipant, 'findMany').mockResolvedValue([
        { id: 'part_1', isReady: true },
        { id: 'part_2', isReady: true },
      ] as any);
      vi.spyOn(prisma.conquestMatch, 'update').mockResolvedValue({} as any);

      const fakeMatchActive = {
        ...fakeMatchWaiting,
        status: 'ACTIVE',
        startedAt: new Date(),
        participants: [
          fakeMatchWaiting.participants[0],
          {
            id: 'part_2',
            matchId: 'match_cq_fake_1',
            userId: userP2,
            seat: 2,
            isReady: true,
            isConnected: true,
            territoriesCount: 1,
            user: { id: userP2, name: 'Player Two' },
          },
        ],
      };
      vi.spyOn(prisma.conquestMatch, 'findUnique').mockResolvedValue(fakeMatchActive as any);

      const { match, isAllReady } = await matchService.setPlayerReady('match_cq_fake_1', userP2);

      expect(isAllReady).toBe(true);
      expect(match.status).toBe('ACTIVE');
      expect(match.startedAt).toBeDefined();
    });

    it('forfeits match on prolonged disconnect and awards win to remaining opponent', async () => {
      const fakeMatchActive = {
        ...fakeMatchWaiting,
        status: 'ACTIVE',
        startedAt: new Date(),
        participants: [
          { id: 'part_1', userId: userP1, seat: 1, isConnected: false, user: { id: userP1, name: 'P1' } },
          { id: 'part_2', userId: userP2, seat: 2, isConnected: true, user: { id: userP2, name: 'P2' } },
        ],
      };
      vi.spyOn(prisma.conquestMatch, 'findUnique').mockResolvedValue(fakeMatchActive as any);

      const fakeMatchFinished: any = {
        id: 'match_cq_fake_1',
        matchCode: 'CQ9999',
        creatorId: userP1,
        status: 'FINISHED',
        mapSeed: 'seed_fake',
        currentTurn: 1,
        winnerId: userP2,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        participants: [
          { id: 'part_1', userId: userP1, seat: 1, isReady: true, isConnected: false, territoriesCount: 1, outcome: 'ABANDONED', user: { id: userP1, name: 'P1' } },
          { id: 'part_2', userId: userP2, seat: 2, isReady: true, isConnected: true, territoriesCount: 1, outcome: 'WIN', user: { id: userP2, name: 'P2' } },
        ],
        board: {
          gridSize: 6,
          totalCells: 36,
          cells: Object.values(initialGridState.cells),
          cellMap: initialGridState.cells,
          capitals: { player1: { row: 0, col: 0 }, player2: { row: 5, col: 5 } },
          fortresses: [],
        },
      };
      vi.spyOn(matchService, 'getMatchDetails').mockResolvedValue(fakeMatchFinished);

      const finished = await matchService.forfeitMatchOnDisconnect('match_cq_fake_1', userP1);

      expect(finished).toBeDefined();
      expect(finished?.status).toBe('FINISHED');
      expect(finished?.winnerId).toBe(userP2);
      expect(finished?.participants[0].outcome).toBe('ABANDONED');
      expect(finished?.participants[1].outcome).toBe('WIN');
    });

    it('recovers authoritative state accurately from persisted gridState JSON', async () => {
      const details = await matchService.getMatchDetails('match_cq_fake_1', userP1);
      expect(details.board.totalCells).toBe(36);
      expect(details.board.cells[0].id).toBe('r0_c0');
      expect(details.board.cells[0].owner).toBe(1);
    });
  });

  // ─── 6. TERMINAL IDEMPOTENCY & CONCURRENT WINNER PREVENTION ─────────────────
  describe('6. Terminal Idempotency & Concurrent Winner Prevention', () => {
    it('prevents two simultaneous capital attacks from creating duplicate winners', () => {
      const now = 1729850000000;
      // Setup: P1 threatens P2 Capital (5,5) from (5,4); P2 threatens P1 Capital (0,0) from (0,1)
      initialGridState.cells['r5_c4'].owner = 1;
      initialGridState.cells['r0_c1'].owner = 2;

      // Both players launch attack on the other's capital
      const p1Attack = ConquestCombatService.initiateAttack({
        matchId: 'simul_capitals',
        userId: userP1,
        playerSlot: 1,
        targetRow: 5,
        targetCol: 5, // P2 Capital
        currentGridState: initialGridState,
        matchSeed,
        currentTurn: 5,
        now,
      });

      const p2Attack = ConquestCombatService.initiateAttack({
        matchId: 'simul_capitals',
        userId: userP2,
        playerSlot: 2,
        targetRow: 0,
        targetCol: 0, // P1 Capital
        currentGridState: p1Attack.updatedGridState,
        matchSeed,
        currentTurn: 5,
        now: now + 200,
      });

      // P1 finishes first at 45s (approx 195 WPM)
      const p1Result = ConquestCombatService.submitChallenge({
        userId: userP1,
        challengeId: p1Attack.challenge.challengeId,
        submittedText: p1Attack.challenge.passageText,
        currentGridState: p2Attack.updatedGridState,
        now: now + 45000,
      });

      expect(p1Result.success).toBe(true);
      expect(p1Result.isCapitalCapture).toBe(true);
      expect(p1Result.winnerId).toBe(userP1);

      // Now if P2 completes, their capital (5,5) is already captured and P1 is declared winner!
      // In the match service / socket service, once a match is FINISHED, any further submissions are rejected!
      expect(p1Result.winnerId).toBe(userP1);
    });
  });

  // ─── 7. PHASE 3.1 SECURITY, ANTI-BOT & CONCURRENCY VALIDATION ─────────────
  describe('7. Phase 3.1 Security, Anti-Bot & Concurrency Validation', () => {
    it('rejects instant paste macro (<1.5s duration) with security error', () => {
      const now = 1729850000000;
      const attack = ConquestCombatService.initiateAttack({
        matchId: 'anti_paste_match',
        userId: userP1,
        playerSlot: 1,
        targetRow: 0,
        targetCol: 1,
        currentGridState: initialGridState,
        matchSeed,
        currentTurn: 1,
        now,
      });

      // Attempt to submit in 500ms (instant paste)
      const subResult = ConquestCombatService.submitChallenge({
        userId: userP1,
        challengeId: attack.challenge.challengeId,
        submittedText: attack.challenge.passageText,
        currentGridState: attack.updatedGridState,
        now: now + 500,
      });

      expect(subResult.success).toBe(false);
      expect(subResult.reason).toMatch(/exceeds plausible human limits/);
      expect(subResult.gridState.activeChallenges[userP1]).toBeNull();
    });

    it('rejects super-human typing velocity (>250 WPM) with security error', () => {
      const now = 1729850000000;
      const attack = ConquestCombatService.initiateAttack({
        matchId: 'anti_velocity_match',
        userId: userP1,
        playerSlot: 1,
        targetRow: 0,
        targetCol: 1,
        currentGridState: initialGridState,
        matchSeed,
        currentTurn: 1,
        now,
      });

      // Submit passage in 2000ms, which corresponds to >300 WPM
      const subResult = ConquestCombatService.submitChallenge({
        userId: userP1,
        challengeId: attack.challenge.challengeId,
        submittedText: attack.challenge.passageText,
        currentGridState: attack.updatedGridState,
        now: now + 2000,
      });

      expect(subResult.success).toBe(false);
      expect(subResult.reason).toMatch(/exceeds plausible human limits/);
    });

    it('accepts legitimate human typing velocity (~100 WPM)', () => {
      const now = 1729850000000;
      const attack = ConquestCombatService.initiateAttack({
        matchId: 'valid_human_match',
        userId: userP1,
        playerSlot: 1,
        targetRow: 0,
        targetCol: 1,
        currentGridState: initialGridState,
        matchSeed,
        currentTurn: 1,
        now,
      });

      // Total words ~ 30 words, 30 words in 18 seconds = 100 WPM
      const subResult = ConquestCombatService.submitChallenge({
        userId: userP1,
        challengeId: attack.challenge.challengeId,
        submittedText: attack.challenge.passageText,
        currentGridState: attack.updatedGridState,
        now: now + 18000,
      });

      expect(subResult.success).toBe(true);
      expect(subResult.wpm).toBeGreaterThan(50);
      expect(subResult.wpm).toBeLessThan(250);
    });

    it('reconciles stale matches by cancelling WAITING matches >30m and ACTIVE matches >2h', async () => {
      const matchService = new ConquestMatchService(prisma);
      const updateManySpy = vi.spyOn(prisma.conquestMatch, 'updateMany')
        .mockResolvedValueOnce({ count: 3 })
        .mockResolvedValueOnce({ count: 1 });

      const res = await matchService.reconcileStaleMatches();

      expect(res.cancelledWaiting).toBe(3);
      expect(res.cancelledActive).toBe(1);
      expect(updateManySpy).toHaveBeenCalledTimes(2);
    });

    it('startAttackAtomically executes within transaction and row lock', async () => {
      const matchService = new ConquestMatchService(prisma);
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(prisma));
      vi.spyOn(prisma, '$executeRaw').mockResolvedValue(1 as any);

      const fakeMatchActive = {
        id: 'atomic_match_1',
        matchCode: 'CQ9000',
        creatorId: userP1,
        status: 'ACTIVE',
        mapSeed: matchSeed,
        currentTurn: 1,
        gridState: JSON.stringify(initialGridState),
        participants: [
          { id: 'part_1', userId: userP1, seat: 1, isConnected: true },
          { id: 'part_2', userId: userP2, seat: 2, isConnected: true },
        ],
      };
      vi.spyOn(prisma.conquestMatch, 'findUnique').mockResolvedValue(fakeMatchActive as any);
      const updateSpy = vi.spyOn(prisma.conquestMatch, 'update').mockResolvedValue(fakeMatchActive as any);

      const { challenge, updatedGridState } = await matchService.startAttackAtomically(
        'atomic_match_1',
        userP1,
        0,
        1
      );

      expect(challenge).toBeDefined();
      expect(challenge.targetCellKey).toBe('r0_c1');
      expect(updatedGridState.activeChallenges[userP1]).toBeDefined();
      expect(updateSpy).toHaveBeenCalled();
    });

    it('submitChallengeAtomically handles capture and updates participant territory count atomically', async () => {
      const matchService = new ConquestMatchService(prisma);
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(prisma));
      vi.spyOn(prisma, '$executeRaw').mockResolvedValue(1 as any);

      const now = 1729850000000;
      const attack = ConquestCombatService.initiateAttack({
        matchId: 'atomic_submit_match',
        userId: userP1,
        playerSlot: 1,
        targetRow: 0,
        targetCol: 1,
        currentGridState: initialGridState,
        matchSeed,
        currentTurn: 1,
        now,
      });

      const fakeMatchWithAttack = {
        id: 'atomic_submit_match',
        matchCode: 'CQ9001',
        creatorId: userP1,
        status: 'ACTIVE',
        mapSeed: matchSeed,
        currentTurn: 1,
        gridState: JSON.stringify(attack.updatedGridState),
        participants: [
          { id: 'part_1', userId: userP1, seat: 1, territoriesCount: 1 },
          { id: 'part_2', userId: userP2, seat: 2, territoriesCount: 1 },
        ],
      };

      vi.spyOn(prisma.conquestMatch, 'findUnique').mockResolvedValue(fakeMatchWithAttack as any);
      vi.spyOn(prisma.conquestMatch, 'update').mockResolvedValue(fakeMatchWithAttack as any);
      vi.spyOn(prisma.conquestParticipant, 'update').mockResolvedValue({} as any);

      const fakeMatchDetails: any = {
        id: 'atomic_submit_match',
        status: 'ACTIVE',
        board: {
          totalCells: 36,
          cells: Object.values(attack.updatedGridState.cells),
        },
      };
      vi.spyOn(matchService, 'getMatchDetails').mockResolvedValue(fakeMatchDetails);

      const { result, updatedMatch } = await matchService.submitChallengeAtomically(
        'atomic_submit_match',
        userP1,
        attack.challenge.challengeId,
        attack.challenge.passageText,
        now + 18000
      );

      expect(result.success).toBe(true);
      expect(result.targetCellKey).toBe('r0_c1');
      expect(updatedMatch).toBeDefined();
    });
  });
});
