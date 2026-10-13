import { createHash } from 'crypto';
import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  calculateSessionXp,
  getLevelFromCumulativeXp,
  resolveStreakTransition,
} from '../services/gamification.service';

// Local types matching Prisma select shapes
type SessionWpmAccuracy = { wpm: number; accuracy: number };
type AchievementIdSelect = { achievementId: string };

interface CachedSessionResult {
  status: number;
  body: Record<string, unknown>;
  expiresAt: number;
}

const EXPLICIT_IDEMPOTENCY_TTL_MS = 15 * 60 * 1000; // 15 minutes
const AUTO_IDEMPOTENCY_TTL_MS = 15 * 1000; // 15 seconds for identical payload retries without explicit key

const completedIdempotencyCache = new Map<string, CachedSessionResult>();
const inFlightIdempotencyMap = new Map<string, Promise<CachedSessionResult>>();
const userSubmissionQueues = new Map<string, Promise<unknown>>();

export function clearSessionIdempotencyCache(): void {
  completedIdempotencyCache.clear();
  inFlightIdempotencyMap.clear();
  userSubmissionQueues.clear();
}

function pruneExpiredIdempotencyEntries(now: number): void {
  for (const [key, entry] of completedIdempotencyCache.entries()) {
    if (entry.expiresAt <= now) {
      completedIdempotencyCache.delete(key);
    }
  }
}

export function resolveSessionIdempotencyKey(req: AuthRequest, userId: string): {
  cacheKey: string;
  clientKey: string;
  ttlMs: number;
} {
  const headerKey =
    req.headers?.['idempotency-key'] ||
    req.headers?.['x-idempotency-key'];
  const rawExplicitKey =
    (Array.isArray(headerKey) ? headerKey[0] : headerKey) ||
    req.body?.idempotencyKey ||
    req.body?.clientSessionId;

  if (typeof rawExplicitKey === 'string' && rawExplicitKey.trim().length > 0) {
    const trimmed = rawExplicitKey.trim();
    return {
      cacheKey: `explicit:${userId}:${trimmed}`,
      clientKey: trimmed,
      ttlMs: EXPLICIT_IDEMPOTENCY_TTL_MS,
    };
  }

  const {
    mode,
    difficulty,
    wpm,
    rawWpm,
    accuracy,
    consistency,
    focusScore,
    duration,
    backspaceCount,
    correctionCount,
    keystrokes,
  } = req.body || {};

  const fingerprintPayload = JSON.stringify({
    userId,
    mode,
    difficulty: difficulty || 1,
    wpm: Number(wpm),
    rawWpm: Number(rawWpm ?? wpm),
    accuracy: Number(accuracy),
    consistency: Number(consistency ?? 100),
    focusScore: Number(focusScore ?? 100),
    duration: Number(duration),
    backspaceCount: Number(backspaceCount ?? 0),
    correctionCount: Number(correctionCount ?? 0),
    keystrokes,
  });

  const digest = createHash('sha256').update(fingerprintPayload).digest('hex');
  return {
    cacheKey: `auto:${userId}:${digest}`,
    clientKey: digest,
    ttlMs: AUTO_IDEMPOTENCY_TTL_MS,
  };
}

function enqueueUserSubmission<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const previous = userSubmissionQueues.get(userId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  const tracked = next.finally(() => {
    if (userSubmissionQueues.get(userId) === tracked) {
      userSubmissionQueues.delete(userId);
    }
  });
  userSubmissionQueues.set(userId, tracked);
  return next;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const submitSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token.' });
    }

    const {
      mode,
      difficulty,
      wpm,
      rawWpm,
      accuracy,
      consistency,
      focusScore,
      duration,
      backspaceCount,
      correctionCount,
      keystrokes,
    } = req.body || {};

    const wpmVal = parseFloat(wpm);
    const accuracyVal = parseFloat(accuracy);
    const durationVal = parseFloat(duration);

    if (
      !mode ||
      typeof mode !== 'string' ||
      wpm === undefined ||
      accuracy === undefined ||
      duration === undefined ||
      !Number.isFinite(wpmVal) ||
      wpmVal < 0 ||
      !Number.isFinite(accuracyVal) ||
      accuracyVal < 0 ||
      !Number.isFinite(durationVal) ||
      durationVal < 0 ||
      !keystrokes ||
      !Array.isArray(keystrokes)
    ) {
      return res.status(400).json({ error: 'Invalid session data.' });
    }

    const nowMs = Date.now();
    pruneExpiredIdempotencyEntries(nowMs);

    const { cacheKey, clientKey, ttlMs } = resolveSessionIdempotencyKey(req, userId);

    // 1. Return cached response immediately if this idempotency key already completed
    const existingCompleted = completedIdempotencyCache.get(cacheKey);
    if (existingCompleted && existingCompleted.expiresAt > nowMs) {
      return res.status(existingCompleted.status).json(existingCompleted.body);
    }

    // 2. Coalesce concurrent duplicate in-flight requests with the same idempotency key
    const existingInFlight = inFlightIdempotencyMap.get(cacheKey);
    if (existingInFlight) {
      const coalesced = await existingInFlight;
      return res.status(coalesced.status).json(coalesced.body);
    }

    const submissionPromise = enqueueUserSubmission(userId, async (): Promise<CachedSessionResult> => {
      // Re-check cache after waiting in user queue
      const cachedAfterQueue = completedIdempotencyCache.get(cacheKey);
      if (cachedAfterQueue && cachedAfterQueue.expiresAt > Date.now()) {
        return cachedAfterQueue;
      }

      const executeTransaction = async (tx: typeof prisma): Promise<CachedSessionResult> => {
        // Fetch fresh user state inside the transaction so concurrent submissions never overwrite newer values
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          throw new HttpError(404, 'User not found.');
        }

        // 1. Save Typing Session
        const session = await tx.typingSession.create({
          data: {
            userId,
            mode,
            difficulty: difficulty || 1,
            wpm: wpmVal,
            rawWpm: parseFloat(rawWpm ?? wpm),
            accuracy: accuracyVal,
            consistency: parseFloat(consistency ?? 100),
            focusScore: parseFloat(focusScore ?? 100),
            duration: durationVal,
            backspaceCount: parseInt(backspaceCount || 0, 10),
            correctionCount: parseInt(correctionCount || 0, 10),
          },
        });

        // 2. Bulk Create Keystroke Logs & Mistake Summaries
        if (keystrokes.length > 0) {
          const formattedKeystrokes = keystrokes.map((ks: any, index: number) => {
            const prevKey = index > 0 ? keystrokes[index - 1].expectedKey : null;
            const nextKey = index < keystrokes.length - 1 ? keystrokes[index + 1].expectedKey : null;
            return {
              sessionId: session.id,
              expectedKey: ks.expectedKey,
              actualKey: ks.actualKey,
              reactionTime: parseInt(ks.reactionTime || 0, 10),
              holdTime: parseInt(ks.holdTime || 80, 10),
              pauseDuration: parseInt(ks.pauseDuration || 0, 10),
              wordIndex: parseInt(ks.wordIndex || 0, 10),
              previousKey: prevKey,
              nextKey: nextKey,
              isMistake: !!ks.isMistake,
              timestamp: new Date(ks.timestamp || Date.now()),
            };
          });

          await tx.keystrokeLog.createMany({
            data: formattedKeystrokes,
          });

          const mistakeKeys = formattedKeystrokes.filter((k) => k.isMistake);
          for (const m of mistakeKeys) {
            await tx.mistakeSummary.upsert({
              where: {
                userId_expectedKey_pressedKey: {
                  userId,
                  expectedKey: m.expectedKey.toUpperCase(),
                  pressedKey: m.actualKey.toUpperCase(),
                },
              },
              update: {
                count: { increment: 1 },
              },
              create: {
                userId,
                expectedKey: m.expectedKey.toUpperCase(),
                pressedKey: m.actualKey.toUpperCase(),
                count: 1,
              },
            });
          }
        }

        // 3. Update Challenges Progress
        const userChallenges = await tx.userChallengeProgress.findMany({
          where: { userId, isCompleted: false },
          include: { challenge: true },
        });

        let extraChallengeXp = 0;
        for (const prog of userChallenges) {
          const ch = prog.challenge;
          let addedVal = 0;

          if (ch.criteriaType === 'SESSIONS') {
            addedVal = 1;
          } else if (ch.criteriaType === 'CHARS') {
            addedVal = keystrokes.length;
          } else if (ch.criteriaType === 'WPM') {
            addedVal = wpmVal >= ch.targetValue ? ch.targetValue : 0;
          } else if (ch.criteriaType === 'ACCURACY') {
            addedVal = accuracyVal >= ch.targetValue ? ch.targetValue : 0;
          }

          const currentVal = Math.min(ch.targetValue, prog.currentValue + addedVal);
          const isNowCompleted = currentVal >= ch.targetValue;

          await tx.userChallengeProgress.update({
            where: { id: prog.id },
            data: {
              currentValue: currentVal,
              isCompleted: isNowCompleted,
            },
          });

          if (isNowCompleted) {
            extraChallengeXp += ch.xpReward;
          }
        }

        // 4. Calculate XP, Streak, and Lifetime Stats
        const gainedXp = calculateSessionXp(accuracyVal, wpmVal, difficulty || 1);
        const sessionCompletedAt = new Date();
        const newStreak = resolveStreakTransition(user.lastActiveAt, user.streak, 'session', sessionCompletedAt);
        const newLongestStreak = Math.max(user.longestStreak, newStreak);

        const totalSessionsCount = await tx.typingSession.count({ where: { userId } });
        const allSessions = await tx.typingSession.findMany({
          where: { userId },
          select: { wpm: true, accuracy: true },
        });

        const safeDivisor = Math.max(1, totalSessionsCount);
        const avgWpm = allSessions.reduce((sum: number, s: SessionWpmAccuracy) => sum + s.wpm, 0) / safeDivisor;
        const avgAccuracy = allSessions.reduce((sum: number, s: SessionWpmAccuracy) => sum + s.accuracy, 0) / safeDivisor;

        const projectedTotalCharacters = user.totalCharacters + keystrokes.length;

        // 5. Check and Award Achievements within the same transaction
        const unlockedAchievements: any[] = [];
        const alreadyUnlocked = await tx.userAchievement.findMany({
          where: { userId },
          select: { achievementId: true },
        });
        const unlockedIds = new Set(alreadyUnlocked.map((a: AchievementIdSelect) => a.achievementId));

        const allAchievements = await tx.achievement.findMany();

        let achievementXp = 0;
        for (const ach of allAchievements) {
          if (unlockedIds.has(ach.id)) continue;

          let meetsCriteria = false;
          if (ach.code === 'FIRST_SESSION') {
            meetsCriteria = true;
          } else if (ach.code === 'STREAK_3' && newStreak >= 3) {
            meetsCriteria = true;
          } else if (ach.code === 'STREAK_7' && newStreak >= 7) {
            meetsCriteria = true;
          } else if (ach.code === 'WPM_60' && wpmVal >= 60) {
            meetsCriteria = true;
          } else if (ach.code === 'WPM_80' && wpmVal >= 80) {
            meetsCriteria = true;
          } else if (ach.code === 'WPM_100' && wpmVal >= 100) {
            meetsCriteria = true;
          } else if (ach.code === 'ACC_95' && accuracyVal >= 95) {
            meetsCriteria = true;
          } else if (ach.code === 'ACC_98' && accuracyVal >= 98) {
            meetsCriteria = true;
          } else if (ach.code === 'ACC_99' && accuracyVal >= 99) {
            meetsCriteria = true;
          } else if (ach.code === 'CHARS_10000' && projectedTotalCharacters >= 10000) {
            meetsCriteria = true;
          } else if (ach.code === 'SESSIONS_100' && totalSessionsCount >= 100) {
            meetsCriteria = true;
          }

          if (meetsCriteria) {
            await tx.userAchievement.upsert({
              where: {
                userId_achievementId: {
                  userId,
                  achievementId: ach.id,
                },
              },
              update: {},
              create: {
                userId,
                achievementId: ach.id,
              },
            });
            unlockedAchievements.push(ach);
            achievementXp += ach.xpReward;
          }
        }

        const totalXpGained = gainedXp + extraChallengeXp + achievementXp;
        const finalXp = user.xp + totalXpGained;
        const finalLevel = getLevelFromCumulativeXp(finalXp);

        // 6. Single atomic user update inside transaction
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            xp: finalXp,
            level: finalLevel,
            streak: newStreak,
            longestStreak: newLongestStreak,
            lastActiveAt: sessionCompletedAt,
            totalCharacters: { increment: keystrokes.length },
            lifetimeWpm: avgWpm,
            lifetimeAccuracy: avgAccuracy,
            practiceHours: { increment: durationVal / 3600 },
          },
        });

        const persistedXp = updatedUser.xp ?? finalXp;
        const persistedLevel = updatedUser.level ?? finalLevel;
        const isLevelUp = persistedLevel > user.level;

        const result: CachedSessionResult = {
          status: 201,
          expiresAt: Date.now() + ttlMs,
          body: {
            session,
            xpGained: totalXpGained,
            level: persistedLevel,
            xp: persistedXp,
            streak: updatedUser.streak,
            longestStreak: updatedUser.longestStreak,
            totalCharacters: updatedUser.totalCharacters,
            lifetimeWpm: updatedUser.lifetimeWpm,
            lifetimeAccuracy: updatedUser.lifetimeAccuracy,
            practiceHours: updatedUser.practiceHours,
            lastActiveAt: updatedUser.lastActiveAt,
            isLevelUp,
            unlockedAchievements,
            idempotencyKey: clientKey,
            user: {
              id: updatedUser.id,
              email: updatedUser.email,
              name: updatedUser.name,
              avatar: updatedUser.avatar,
              level: persistedLevel,
              xp: persistedXp,
              streak: updatedUser.streak,
              longestStreak: updatedUser.longestStreak,
              totalCharacters: updatedUser.totalCharacters,
              lifetimeWpm: updatedUser.lifetimeWpm,
              lifetimeAccuracy: updatedUser.lifetimeAccuracy,
              practiceHours: updatedUser.practiceHours,
              lastActiveAt: updatedUser.lastActiveAt,
              academyProgress: updatedUser.academyProgress,
            },
          },
        };

        completedIdempotencyCache.set(cacheKey, result);
        return result;
      };

      if (typeof prisma.$transaction === 'function') {
        return prisma.$transaction(async (tx) => executeTransaction(tx as typeof prisma));
      }
      return executeTransaction(prisma);
    });

    inFlightIdempotencyMap.set(cacheKey, submissionPromise);
    try {
      const outcome = await submissionPromise;
      return res.status(outcome.status).json(outcome.body);
    } finally {
      inFlightIdempotencyMap.delete(cacheKey);
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Session submission error:', error);
    return res.status(500).json({ error: 'An error occurred during session recording.' });
  }
};

export const getUserSessions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token.' });
    }

    const rawLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const limit = isNaN(rawLimit) ? 20 : Math.min(100, Math.max(1, rawLimit));

    const sessions = await prisma.typingSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { keystrokes: true }
        }
      }
    });

    return res.status(200).json(sessions);
  } catch (error: unknown) {
    console.error('Error fetching user sessions:', error);
    return res.status(500).json({ error: 'An error occurred fetching user sessions.' });
  }
};

