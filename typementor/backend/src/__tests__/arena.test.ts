import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app, { prisma } from '../app';
import { JWT_SECRET } from '../config/env';
import { ArenaScoringService } from '../services/arena/arena-scoring.service';
import { ArenaPointsService } from '../services/arena/arena-points.service';
import { ArenaMatchService } from '../services/arena/arena-match.service';
import { ARENA_CONFIG } from '../services/arena/arena.types';
import { ArenaTicketService, arenaTicketService } from '../services/arena/arena-ticket.service';
import { isAllowedOrigin } from '../services/arena/arena-socket.service';

describe('Arena Feature Test Suite', () => {
  const testUserId1 = 'user_arena_test_1';
  const testUserId2 = 'user_arena_test_2';
  const testUserId3 = 'user_arena_test_3';

  const token1 = jwt.sign({ id: testUserId1, email: 'arena1@example.com' }, JWT_SECRET, { expiresIn: '1h' });
  const token2 = jwt.sign({ id: testUserId2, email: 'arena2@example.com' }, JWT_SECRET, { expiresIn: '1h' });
  const token3 = jwt.sign({ id: testUserId3, email: 'arena3@example.com' }, JWT_SECRET, { expiresIn: '1h' });

  let pointsService: ArenaPointsService;
  let matchService: ArenaMatchService;

  beforeEach(() => {
    vi.restoreAllMocks();
    pointsService = new ArenaPointsService(prisma);
    matchService = new ArenaMatchService(prisma, pointsService);
  });

  // ── 1. Authoritative Scoring & Anti-Cheat Logic ─────────────────────────────
  describe('1. ArenaScoringService (Authoritative Scoring & Anti-Cheat)', () => {
    const passage = 'The quick brown fox jumps over the lazy dog near the riverbank.';

    it('calculates accurate net WPM and 100% accuracy for a perfect submission', () => {
      const startedAt = new Date(Date.now() - 30000); // 30 seconds ago (0.5 min)
      const submittedAt = new Date();

      const result = ArenaScoringService.evaluateFinalSubmission(
        passage,
        passage,
        startedAt,
        submittedAt
      );

      expect(result.accuracy).toBe(100);
      expect(result.isFullyCompleted).toBe(true);
      // Net words = passage.length / 5 = 63 / 5 = 12.6 words
      // WPM = 12.6 words / 0.5 min = ~25.2 WPM
      expect(result.wpm).toBeGreaterThan(24);
      expect(result.wpm).toBeLessThan(26);
    });

    it('penalizes incorrect characters and computes correct reduced accuracy', () => {
      const startedAt = new Date(Date.now() - 20000);
      const submittedAt = new Date();

      // Submit text with errors
      const flawedText = 'The qu1ck br0wn f0x jumps over the lazy dog near the riverbank.';
      const result = ArenaScoringService.evaluateFinalSubmission(
        passage,
        flawedText,
        startedAt,
        submittedAt
      );

      expect(result.accuracy).toBeLessThan(100);
      expect(result.accuracy).toBeGreaterThan(90);
    });

    it('rejects incomplete text from being marked fully completed', () => {
      const startedAt = new Date(Date.now() - 10000);
      const partialText = 'The quick brown fox';

      const result = ArenaScoringService.evaluateFinalSubmission(
        passage,
        partialText,
        startedAt,
        new Date()
      );

      expect(result.isFullyCompleted).toBe(false);
    });

    it('clamps negative or oversized in-flight progress safely', () => {
      const startedAt = new Date(Date.now() - 5000);

      const invalidResult = ArenaScoringService.evaluateProgress(
        passage,
        startedAt,
        -10,
        0
      );
      expect(invalidResult.isValid).toBe(false);

      const oversizedResult = ArenaScoringService.evaluateProgress(
        passage,
        startedAt,
        9999,
        0
      );
      expect(oversizedResult.isValid).toBe(true);
      expect(oversizedResult.correctChars).toBe(passage.length);
      expect(oversizedResult.progressPercent).toBe(100);
    });
  });

  // ── 2. Transactional Points Accounting & Idempotency ──────────────────────
  describe('2. ArenaPointsService (Transactional Point Rules)', () => {
    it('initializes new user with welcome grant ledger idempotently', async () => {
      const mockFindUnique = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: testUserId1,
        arenaPoints: 100,
      } as any);

      const mockLedgerFind = vi.spyOn(prisma.arenaPointLedger, 'findUnique').mockResolvedValue(null);

      const mockTx = vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          arenaPointLedger: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({}),
          },
          user: {
            update: vi.fn().mockResolvedValue({}),
          },
        });
      });

      const balance = await pointsService.getOrCreateUserBalance(testUserId1);
      expect(balance).toBe(100);
      expect(mockFindUnique).toHaveBeenCalled();
      expect(mockLedgerFind).toHaveBeenCalled();
      expect(mockTx).toHaveBeenCalled();
    });

    it('rejects stake locking when user has insufficient balance', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          arenaPointLedger: { findUnique: vi.fn().mockResolvedValue(null) },
          user: { findUnique: vi.fn().mockResolvedValue({ id: testUserId1, arenaPoints: 20 }) },
        });
      });

      await expect(pointsService.lockStake(testUserId1, 'match_1', 50)).rejects.toThrow(
        /Insufficient Arena Points/
      );
    });

    it('rejects stakes that exceed the server maximum', async () => {
      const excessiveStake = ARENA_CONFIG.MAX_ARENA_STAKE + 100;
      await expect(pointsService.lockStake(testUserId1, 'match_1', excessiveStake)).rejects.toThrow(
        /Stake exceeds server maximum/
      );
    });

    it('prevents double stake deduction under retry via idempotency key', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          arenaPointLedger: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'existing_ledger_1',
              balanceAfter: 50,
            }),
          },
        });
      });

      const remainingBalance = await pointsService.lockStake(testUserId1, 'match_1', 50);
      expect(remainingBalance).toBe(50);
    });

    it('settles winner atomically by awarding the combined pot', async () => {
      const updateMatchMock = vi.fn().mockResolvedValue({});
      const updateUserMock = vi.fn().mockResolvedValue({});
      const createLedgerMock = vi.fn().mockResolvedValue({});

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          arenaPointLedger: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: createLedgerMock,
          },
          user: {
            findUnique: vi.fn().mockResolvedValue({ id: testUserId1, arenaPoints: 50 }),
            update: updateUserMock,
          },
          arenaMatch: {
            update: updateMatchMock,
          },
        });
      });

      // Stake was 50, pot is 100
      await pointsService.settleWinner('match_win_1', testUserId1, 50);

      expect(updateUserMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { arenaPoints: 150 }, // 50 existing + 100 pot
        })
      );
      expect(createLedgerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 100,
            type: 'MATCH_WIN',
          }),
        })
      );
    });
  });

  // ── 3. Match Lifecycle & State Machine Transitions ─────────────────────────
  describe('3. ArenaMatchService (Lifecycle & Concurrency Guards)', () => {
    it('creates a new waiting match and assigns a 6-character matchCode', async () => {
      vi.spyOn(pointsService, 'getOrCreateUserBalance').mockResolvedValue(500);
      vi.spyOn(prisma.arenaParticipant, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.arenaMatch, 'findUnique').mockResolvedValue(null);

      const fakeMatch = {
        id: 'match_created_1',
        matchCode: 'ARN123',
        creatorId: testUserId1,
        status: 'WAITING',
        passageId: 'passage_s1',
        passageText: 'Sample text',
        passageTitle: 'Title',
        passageWordCount: 20,
        stakeAmount: 0,
        isRanked: false,
        maxDuration: 120,
        countdownSeconds: 5,
        winnerId: null,
        isTie: false,
        settlementStatus: 'PENDING',
        createdAt: new Date(),
        participants: [
          {
            userId: testUserId1,
            seat: 1,
            isReady: true,
            isConnected: true,
            progressPercent: 0,
            charsTyped: 0,
            wpm: 0,
            accuracy: 0,
            user: { name: 'Player One', avatar: null },
          },
        ],
      };

      vi.spyOn(prisma, '$transaction').mockResolvedValue(fakeMatch as any);

      const created = await matchService.createMatch(testUserId1, { stakeAmount: 0 });
      expect(created.status).toBe('WAITING');
      expect(created.creatorId).toBe(testUserId1);
      expect(created.participants.length).toBe(1);
      expect(created.matchCode.length).toBe(6);
    });

    it('rejects creator from joining their own match as an opponent', async () => {
      vi.spyOn(prisma.arenaMatch, 'findFirst').mockResolvedValue({
        id: 'match_1',
        matchCode: 'ARN999',
        creatorId: testUserId1,
        status: 'WAITING',
        participants: [{ userId: testUserId1 }],
      } as any);

      await expect(matchService.joinMatch(testUserId1, 'ARN999')).rejects.toThrow(
        /cannot join your own match/
      );
    });

    it('rejects a 3rd player from joining when match already has 2 participants', async () => {
      vi.spyOn(prisma.arenaMatch, 'findFirst').mockResolvedValue({
        id: 'match_full_1',
        matchCode: 'FULL88',
        creatorId: testUserId1,
        status: 'WAITING',
        participants: [{ userId: testUserId1 }, { userId: testUserId2 }],
      } as any);

      await expect(matchService.joinMatch(testUserId3, 'FULL88')).rejects.toThrow(
        /already has two participants/
      );
    });

    it('prevents joining an expired or cancelled match', async () => {
      vi.spyOn(prisma.arenaMatch, 'findFirst').mockResolvedValue({
        id: 'match_cancelled_1',
        matchCode: 'CANC77',
        creatorId: testUserId1,
        status: 'CANCELLED',
        participants: [{ userId: testUserId1 }],
      } as any);

      await expect(matchService.joinMatch(testUserId2, 'CANC77')).rejects.toThrow(
        /cannot be joined/
      );
    });

    it('only allows the match creator to cancel a match', async () => {
      vi.spyOn(prisma.arenaMatch, 'findUnique').mockResolvedValue({
        id: 'match_1',
        creatorId: testUserId1,
        status: 'WAITING',
        participants: [{ userId: testUserId1 }],
      } as any);

      await expect(matchService.cancelMatch(testUserId2, 'match_1')).rejects.toThrow(
        /Only the match creator can cancel/
      );
    });
  });

  // ── 4. Authenticated HTTP Endpoints ────────────────────────────────────────
  describe('4. Arena HTTP REST API Security & Endpoints', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/arena/balance');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Access denied/i);
    });

    it('returns balance for authenticated user', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: testUserId1,
        arenaPoints: 250,
      } as any);
      vi.spyOn(prisma.arenaPointLedger, 'findUnique').mockResolvedValue({ id: 'grant_1' } as any);

      const res = await request(app)
        .get('/api/arena/balance')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.balance).toBe(250);
    });

    it('returns open waiting matches for discovery', async () => {
      vi.spyOn(prisma.arenaMatch, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/arena/open')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.matches)).toBe(true);
    });

    it('rejects match creation with invalid stake numbers', async () => {
      const res = await request(app)
        .post('/api/arena/matches')
        .set('Authorization', `Bearer ${token1}`)
        .send({ stakeAmount: 999999 }); // Exceeds max stake

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Maximum stake allowed/i);
    });
  });

  // ── 5. Audit A: Single-Use Connection Tickets & Origin Validation ───────────
  describe('5. Audit A: Single-Use Connection Tickets & Origin Validation', () => {
    it('issues single-use ticket and consumes it exactly once', () => {
      const service = new ArenaTicketService(60000);
      const { ticket, expiresIn } = service.issueTicket(testUserId1, 'user1@example.com');

      expect(ticket).toHaveLength(64);
      expect(expiresIn).toBe(60);

      // First consumption succeeds
      const consumed = service.consumeTicket(ticket);
      expect(consumed).not.toBeNull();
      expect(consumed?.userId).toBe(testUserId1);
      expect(consumed?.email).toBe('user1@example.com');

      // Second consumption fails (replay attack prevented)
      const secondConsume = service.consumeTicket(ticket);
      expect(secondConsume).toBeNull();

      service.destroy();
    });

    it('rejects expired tickets', () => {
      // 1ms TTL for test
      const shortLivedService = new ArenaTicketService(1);
      const { ticket } = shortLivedService.issueTicket(testUserId1, 'user1@example.com');

      // Wait 10ms for expiration
      const start = Date.now();
      while (Date.now() - start < 10) {}

      const consumed = shortLivedService.consumeTicket(ticket);
      expect(consumed).toBeNull();

      shortLivedService.destroy();
    });

    it('validates allowed origins and blocks untrusted cross-origin requests', () => {
      expect(isAllowedOrigin(undefined)).toBe(true);
      expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
      expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
      expect(isAllowedOrigin('https://typementor-ai-frontend.vercel.app')).toBe(true);
      expect(isAllowedOrigin('https://typementor.in')).toBe(true);
      expect(isAllowedOrigin('https://www.typementor.in')).toBe(true);
      expect(isAllowedOrigin('https://preview-deploy.vercel.app')).toBe(true);

      expect(isAllowedOrigin('https://untrusted-malicious-site.com')).toBe(false);
      expect(isAllowedOrigin('http://evil-phishing.org')).toBe(false);
    });

    it('provides authenticated ticket via POST /api/arena/ws-ticket', async () => {
      const unauthRes = await request(app).post('/api/arena/ws-ticket');
      expect(unauthRes.status).toBe(401);

      const res = await request(app)
        .post('/api/arena/ws-ticket')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.ticket).toHaveLength(64);
      expect(res.body.expiresIn).toBe(60);

      // Verify the issued ticket can be consumed from the singleton service
      const consumed = arenaTicketService.consumeTicket(res.body.ticket);
      expect(consumed?.userId).toBe(testUserId1);
    });
  });

  // ── 6. Audit D: Database-Backed Lifecycle Reconciliation ───────────────────
  describe('6. Audit D: Database-Backed Lifecycle Reconciliation', () => {
    it('automatically reconciles expired waiting matches and refunds stakes', async () => {
      const pastDate = new Date(Date.now() - 60000);
      const staleMatch = {
        id: 'match_stale_1',
        status: 'WAITING',
        expiresAt: pastDate,
        stakeAmount: 50,
        participants: [{ userId: testUserId1 }],
      };

      vi.spyOn(prisma.arenaMatch, 'findMany')
        .mockResolvedValueOnce([staleMatch as any]) // for staleWaitingMatches
        .mockResolvedValueOnce([]); // for overdueActiveMatches

      const updateMatchMock = vi.spyOn(prisma.arenaMatch, 'update').mockResolvedValue({} as any);
      const refundMock = vi.spyOn(pointsService, 'refundMatchStakes').mockResolvedValue();

      const result = await matchService.reconcileStaleMatches();

      expect(result.expiredWaiting).toBe(1);
      expect(updateMatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'match_stale_1' },
          data: expect.objectContaining({ status: 'EXPIRED' }),
        })
      );
      expect(refundMock).toHaveBeenCalledWith('match_stale_1', 'EXPIRED');
    });

    it('automatically resolves overdue active matches that exceeded deadline', async () => {
      const pastStartedAt = new Date(Date.now() - 200000); // 200s ago (> 120s max + 30s)
      const overdueActiveMatch = {
        id: 'match_overdue_active_1',
        status: 'ACTIVE',
        startedAt: pastStartedAt,
        maxDuration: 120,
        stakeAmount: 100,
        participants: [
          { userId: testUserId1, progressPercent: 80, wpm: 70 },
          { userId: testUserId2, progressPercent: 50, wpm: 45 },
        ],
      };

      vi.spyOn(prisma.arenaMatch, 'findMany')
        .mockResolvedValueOnce([]) // for staleWaitingMatches
        .mockResolvedValueOnce([overdueActiveMatch as any]); // for overdueActiveMatches

      const updateMatchMock = vi.spyOn(prisma.arenaMatch, 'update').mockResolvedValue({} as any);
      const settleWinnerMock = vi.spyOn(pointsService, 'settleWinner').mockResolvedValue();

      const result = await matchService.reconcileStaleMatches();

      expect(result.overdueActive).toBe(1);
      expect(updateMatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'match_overdue_active_1' },
          data: expect.objectContaining({
            status: 'FINISHED',
            winnerId: testUserId1,
            isTie: false,
          }),
        })
      );
      expect(settleWinnerMock).toHaveBeenCalledWith('match_overdue_active_1', testUserId1, 100);
    });
  });
});
