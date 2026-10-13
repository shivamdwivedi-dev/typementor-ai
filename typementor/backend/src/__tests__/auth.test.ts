import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    challenge: {
      findMany: vi.fn(),
    },
    userChallengeProgress: {
      upsert: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock('../app', () => ({
  prisma: mockPrisma,
  authLimiter: (_req: any, _res: any, next: any) => next(),
}));

import {
  login,
  getProfile,
  updateLastActivity,
  updateAcademyProgress,
  spendXp,
} from '../controllers/auth.controller';

function createMockRes() {
  const res: any = { statusCode: 200, body: null };
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

describe('Auth Controller - Streak Transitions & Qualifying Practice Separation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.challenge.findMany.mockResolvedValue([]);
  });

  describe('Login streak behavior (never increments streak or updates lastActiveAt on login)', () => {
    it('does NOT increment streak when logging in the day after practicing, and returned streak matches DB', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const passwordHash = await bcrypt.hash('Password123!', 4);

      const dbUser = {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        passwordHash,
        avatar: null,
        streak: 5,
        longestStreak: 8,
        lastActiveAt: yesterday,
        xp: 400,
        level: 1,
        totalCharacters: 1200,
        lifetimeWpm: 58,
        lifetimeAccuracy: 96,
        practiceHours: 1.5,
        academyProgress: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(dbUser);
      mockPrisma.user.update.mockImplementation(async ({ data }: any) => ({
        ...dbUser,
        ...data,
      }));

      const req: any = {
        body: { email: 'alice@example.com', password: 'Password123!' },
      };
      const res = createMockRes();

      await login(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
      const updateData = mockPrisma.user.update.mock.calls[0][0].data;
      expect(updateData.streak).toBe(5); // Must NOT become 6 on login
      expect(updateData.longestStreak).toBe(8);
      expect(updateData).not.toHaveProperty('lastActiveAt');

      expect(res.body.user.streak).toBe(5);
      expect(res.body.user.longestStreak).toBe(8);
    });

    it('resets streak to 0 in DB and response when logging in after missing 1+ full days', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const passwordHash = await bcrypt.hash('Password123!', 4);

      const dbUser = {
        id: 'user-2',
        name: 'Bob',
        email: 'bob@example.com',
        passwordHash,
        avatar: null,
        streak: 9,
        longestStreak: 12,
        lastActiveAt: threeDaysAgo,
        xp: 900,
        level: 2,
        totalCharacters: 4500,
        lifetimeWpm: 70,
        lifetimeAccuracy: 97,
        practiceHours: 3.2,
        academyProgress: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(dbUser);
      mockPrisma.user.update.mockImplementation(async ({ data }: any) => ({
        ...dbUser,
        ...data,
      }));

      const req: any = {
        body: { email: 'bob@example.com', password: 'Password123!' },
      };
      const res = createMockRes();

      await login(req, res);

      expect(res.statusCode).toBe(200);
      const updateData = mockPrisma.user.update.mock.calls[0][0].data;
      expect(updateData.streak).toBe(0);
      expect(updateData.longestStreak).toBe(12);
      expect(updateData).not.toHaveProperty('lastActiveAt');

      expect(res.body.user.streak).toBe(0);
      expect(res.body.user.longestStreak).toBe(12);
    });

    it('getProfile returns DB-synchronized streak when expired streak is reset', async () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const dbUser = {
        id: 'user-3',
        name: 'Charlie',
        email: 'charlie@example.com',
        passwordHash: 'hashed',
        streak: 4,
        longestStreak: 10,
        lastActiveAt: fourDaysAgo,
        xp: 250,
        level: 1,
        achievements: [],
        challenges: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue({ ...dbUser });
      mockPrisma.user.update.mockResolvedValue({ ...dbUser, streak: 0, longestStreak: 10 });

      const req: any = { user: { id: 'user-3', email: 'charlie@example.com' } };
      const res = createMockRes();

      await getProfile(req, res);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-3' },
        data: { streak: 0, longestStreak: 10 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.streak).toBe(0);
      expect(res.body.longestStreak).toBe(10);
    });
  });

  describe('Non-practice activity separation (Regression Tests)', () => {
    it('updateLastActivity (resume/navigation save) does NOT touch lastActiveAt or streak', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        lastActivity: JSON.stringify({ path: '/academy', type: 'academy' }),
        lastActiveAt: yesterday,
        streak: 5,
      });

      const req: any = {
        user: { id: 'user-1', email: 'alice@example.com' },
        body: {
          activity: { path: '/academy', type: 'academy', lessonId: 'lesson-2' },
        },
      };
      const res = createMockRes();

      await updateLastActivity(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
      const updateData = mockPrisma.user.update.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('lastActiveAt');
      expect(updateData).not.toHaveProperty('streak');
      expect(updateData).toEqual({
        lastActivity: JSON.stringify({ path: '/academy', type: 'academy', lessonId: 'lesson-2' }),
      });
    });

    it('updateAcademyProgress does NOT touch lastActiveAt or streak', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        academyProgress: JSON.stringify({ completedLessonIds: ['b1', 'b2'] }),
        streak: 5,
        lastActiveAt: yesterday,
      });

      const req: any = {
        user: { id: 'user-1', email: 'alice@example.com' },
        body: {
          progress: { completedLessonIds: ['b1', 'b2'], xpBonus: 50 },
        },
      };
      const res = createMockRes();

      await updateAcademyProgress(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
      const updateData = mockPrisma.user.update.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('lastActiveAt');
      expect(updateData).not.toHaveProperty('streak');
      expect(updateData).toEqual({
        academyProgress: JSON.stringify({ completedLessonIds: ['b1', 'b2'], xpBonus: 50 }),
      });
    });

    it('spendXp does NOT touch lastActiveAt or streak', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        xp: 600,
        level: 2,
        streak: 5,
        lastActiveAt: yesterday,
      });

      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        xp: 200,
        level: 2,
        streak: 5,
        lastActiveAt: yesterday,
      });

      const req: any = {
        user: { id: 'user-1', email: 'alice@example.com' },
        body: {
          amount: 400,
        },
      };
      const res = createMockRes();

      await spendXp(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
      const updateData = mockPrisma.user.update.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('lastActiveAt');
      expect(updateData).not.toHaveProperty('streak');
      expect(updateData).toEqual({ xp: 200 });
    });
  });
});
