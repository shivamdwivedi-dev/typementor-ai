import { describe, it, expect, vi, beforeEach } from 'vitest';

const { state, mockPrisma } = vi.hoisted(() => {
  const state = {
    user: {
      id: 'user-tx-1',
      name: 'Taylor',
      email: 'taylor@example.com',
      avatar: null,
      xp: 100,
      level: 1,
      streak: 2,
      longestStreak: 4,
      lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      totalCharacters: 500,
      lifetimeWpm: 60,
      lifetimeAccuracy: 97,
      practiceHours: 1,
      academyProgress: null,
    },
    sessions: [] as any[],
    keystrokeBatches: [] as any[],
    mistakes: new Map<string, number>(),
  };

  const txClient = {
    typingSession: {
      create: vi.fn(async ({ data }: any) => {
        const created = {
          id: `session-${state.sessions.length + 1}`,
          createdAt: new Date(),
          ...data,
        };
        state.sessions.push(created);
        return created;
      }),
      count: vi.fn(async ({ where }: any) => {
        return state.sessions.filter((s) => s.userId === where.userId).length;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return state.sessions
          .filter((s) => s.userId === where.userId)
          .map((s) => ({ wpm: s.wpm, accuracy: s.accuracy }));
      }),
      aggregate: vi.fn(async ({ where }: any) => {
        const userSessions = state.sessions.filter((s) => s.userId === where.userId);
        const count = userSessions.length;
        if (count === 0) {
          return { _count: { id: 0 }, _avg: { wpm: null, accuracy: null } };
        }
        const totalWpm = userSessions.reduce((sum, s) => sum + s.wpm, 0);
        const totalAcc = userSessions.reduce((sum, s) => sum + s.accuracy, 0);
        return {
          _count: { id: count },
          _avg: { wpm: totalWpm / count, accuracy: totalAcc / count },
        };
      }),
    },
    keystrokeLog: {
      createMany: vi.fn(async ({ data }: any) => {
        state.keystrokeBatches.push(data);
        return { count: data.length };
      }),
    },
    mistakeSummary: {
      upsert: vi.fn(async ({ where, create }: any) => {
        const key = `${where.userId_expectedKey_pressedKey.userId}:${where.userId_expectedKey_pressedKey.expectedKey}:${where.userId_expectedKey_pressedKey.pressedKey}`;
        const nextCount = (state.mistakes.get(key) || 0) + (create.count || 1);
        state.mistakes.set(key, nextCount);
        return { count: nextCount };
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id !== state.user.id) return null;
        return { ...state.user };
      }),
      update: vi.fn(async ({ data }: any) => {
        if (typeof data.xp === 'number') state.user.xp = data.xp;
        if (typeof data.level === 'number') state.user.level = data.level;
        if (typeof data.streak === 'number') state.user.streak = data.streak;
        if (typeof data.longestStreak === 'number') state.user.longestStreak = data.longestStreak;
        if (data.lastActiveAt) state.user.lastActiveAt = data.lastActiveAt;
        if (typeof data.lifetimeWpm === 'number') state.user.lifetimeWpm = data.lifetimeWpm;
        if (typeof data.lifetimeAccuracy === 'number') state.user.lifetimeAccuracy = data.lifetimeAccuracy;
        if (data.totalCharacters?.increment) {
          state.user.totalCharacters += data.totalCharacters.increment;
        }
        if (data.practiceHours?.increment) {
          state.user.practiceHours += data.practiceHours.increment;
        }
        return { ...state.user };
      }),
    },
    userChallengeProgress: {
      findMany: vi.fn(async () => []),
      update: vi.fn(),
    },
    achievement: {
      findMany: vi.fn(async () => []),
    },
    userAchievement: {
      findMany: vi.fn(async () => []),
      upsert: vi.fn(async () => ({})),
    },
  };

  const mockPrisma = {
    $transaction: vi.fn(async (callback: (tx: typeof txClient) => Promise<any>) => {
      return callback(txClient);
    }),
  };

  return { state, mockPrisma };
});

vi.mock('../app', () => ({
  prisma: mockPrisma,
}));

import { submitSession, clearSessionIdempotencyCache } from '../controllers/session.controller';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
  };
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((payload: any) => {
    res.body = payload;
    return res;
  });
  return res;
}

describe('Session Controller - Idempotency & Transaction Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSessionIdempotencyCache();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    state.user = {
      id: 'user-tx-1',
      name: 'Taylor',
      email: 'taylor@example.com',
      avatar: null,
      xp: 100,
      level: 1,
      streak: 2,
      longestStreak: 4,
      lastActiveAt: yesterday,
      totalCharacters: 500,
      lifetimeWpm: 60,
      lifetimeAccuracy: 97,
      practiceHours: 1,
      academyProgress: null,
    };
    state.sessions = [];
    state.keystrokeBatches = [];
    state.mistakes.clear();
  });

  it('prevents duplicate session creation and double rewards when the same Idempotency-Key is retried', async () => {
    const req1: any = {
      user: { id: 'user-tx-1', email: 'taylor@example.com' },
      headers: { 'idempotency-key': 'idem-key-001' },
      body: {
        wpm: 72,
        rawWpm: 75,
        accuracy: 98,
        duration: 60,
        mode: 'timed',
        difficulty: 2,
        keystrokes: [{ expectedKey: 'a', actualKey: 'a', reactionTime: 90, isMistake: false }],
      },
    };
    const res1 = createMockRes();
    await submitSession(req1, res1);

    expect(res1.statusCode).toBe(201);
    expect(state.sessions).toHaveLength(1);
    const xpAfterFirst = state.user.xp;
    const streakAfterFirst = state.user.streak;
    expect(xpAfterFirst).toBeGreaterThan(100);
    expect(streakAfterFirst).toBe(3); // Incremented from 2 -> 3

    // Retry with the same Idempotency-Key
    const req2: any = {
      user: { id: 'user-tx-1', email: 'taylor@example.com' },
      headers: { 'idempotency-key': 'idem-key-001' },
      body: { ...req1.body },
    };
    const res2 = createMockRes();
    await submitSession(req2, res2);

    expect(res2.statusCode).toBe(201);
    expect(res2.body.session.id).toBe(res1.body.session.id);
    expect(res2.body.idempotencyKey).toBe('idem-key-001');
    // Database transaction must NOT have run a second time
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(state.sessions).toHaveLength(1);
    expect(state.user.xp).toBe(xpAfterFirst);
    expect(state.user.streak).toBe(streakAfterFirst);
  });

  it('prevents duplicate session creation on rapid double-click with identical payload even without explicit header', async () => {
    const payload = {
      wpm: 65,
      rawWpm: 68,
      accuracy: 96,
      duration: 30,
      mode: 'free',
      difficulty: 1,
      keystrokes: [
        { expectedKey: 't', actualKey: 't', reactionTime: 100, isMistake: false },
        { expectedKey: 'e', actualKey: 'e', reactionTime: 80, isMistake: false },
      ],
    };

    const req1: any = {
      user: { id: 'user-tx-1', email: 'taylor@example.com' },
      headers: {},
      body: payload,
    };
    const req2: any = {
      user: { id: 'user-tx-1', email: 'taylor@example.com' },
      headers: {},
      body: { ...payload },
    };
    const res1 = createMockRes();
    const res2 = createMockRes();

    await Promise.all([submitSession(req1, res1), submitSession(req2, res2)]);

    expect(state.sessions).toHaveLength(1);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(res1.body.session.id).toBe(res2.body.session.id);
  });

  it('serializes concurrent distinct submissions for the same user without overwriting newer user XP or streak', async () => {
    const reqA: any = {
      user: { id: 'user-tx-1', email: 'taylor@example.com' },
      headers: { 'idempotency-key': 'distinct-session-a' },
      body: {
        wpm: 60,
        rawWpm: 62,
        accuracy: 100,
        duration: 60,
        mode: 'timed',
        difficulty: 2,
        keystrokes: [
          { expectedKey: 'a', actualKey: 'a', reactionTime: 85, isMistake: false },
          { expectedKey: 'b', actualKey: 'b', reactionTime: 85, isMistake: false },
        ],
      },
    };

    const reqB: any = {
      user: { id: 'user-tx-1', email: 'taylor@example.com' },
      headers: { 'idempotency-key': 'distinct-session-b' },
      body: {
        wpm: 90,
        rawWpm: 92,
        accuracy: 100,
        duration: 60,
        mode: 'timed',
        difficulty: 3,
        keystrokes: [
          { expectedKey: 'c', actualKey: 'c', reactionTime: 70, isMistake: false },
          { expectedKey: 'd', actualKey: 'd', reactionTime: 70, isMistake: false },
          { expectedKey: 'e', actualKey: 'e', reactionTime: 70, isMistake: false },
        ],
      },
    };

    const resA = createMockRes();
    const resB = createMockRes();

    // Launch both concurrently
    await Promise.all([submitSession(reqA, resA), submitSession(reqB, resB)]);

    expect(resA.statusCode).toBe(201);
    expect(resB.statusCode).toBe(201);
    expect(state.sessions).toHaveLength(2);

    // Session A XP: 25 base + 25 acc + 20 wpm + 10 difficulty = 80
    // Session B XP: 25 base + 25 acc + 25 wpm (capped at 25) + 15 difficulty = 90
    // Initial XP: 100 -> Total XP must be 100 + 80 + 90 = 270 (neither overwrote the other)
    expect(state.user.xp).toBe(270);
    // Streak incremented once from yesterday (2 -> 3) and stayed 3 on second same-day session
    expect(state.user.streak).toBe(3);
    // Characters accumulated: 500 + 2 + 3 = 505
    expect(state.user.totalCharacters).toBe(505);
  });
});
