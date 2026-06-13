import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth.middleware';
import { calculateSessionXp, getLevelFromCumulativeXp, getUpdatedStreakOnSession } from '../services/gamification.service';

// Local types matching Prisma select shapes
type SessionWpmAccuracy = { wpm: number; accuracy: number };
type AchievementIdSelect = { achievementId: string };

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
      keystrokes, // Array of: { expectedKey, actualKey, timestamp, wordIndex, reactionTime, holdTime, pauseDuration, isMistake }
    } = req.body;

    if (
      !mode ||
      wpm === undefined ||
      accuracy === undefined ||
      duration === undefined ||
      !keystrokes ||
      !Array.isArray(keystrokes)
    ) {
      return res.status(400).json({ error: 'Invalid session data.' });
    }

    // 1. Save Typing Session
    const session = await prisma.typingSession.create({
      data: {
        userId,
        mode,
        difficulty: difficulty || 1,
        wpm: parseFloat(wpm),
        rawWpm: parseFloat(rawWpm || wpm),
        accuracy: parseFloat(accuracy),
        consistency: parseFloat(consistency || 100),
        focusScore: parseFloat(focusScore || 100),
        duration: parseFloat(duration),
        backspaceCount: parseInt(backspaceCount || 0),
        correctionCount: parseInt(correctionCount || 0),
      },
    });

    // 2. Bulk Create Keystroke Logs
    if (keystrokes.length > 0) {
      // Map previous and next keys for mistake intelligence
      const formattedKeystrokes = keystrokes.map((ks: any, index: number) => {
        const prevKey = index > 0 ? keystrokes[index - 1].expectedKey : null;
        const nextKey = index < keystrokes.length - 1 ? keystrokes[index + 1].expectedKey : null;
        return {
          sessionId: session.id,
          expectedKey: ks.expectedKey,
          actualKey: ks.actualKey,
          reactionTime: parseInt(ks.reactionTime || 0),
          holdTime: parseInt(ks.holdTime || 80),
          pauseDuration: parseInt(ks.pauseDuration || 0),
          wordIndex: parseInt(ks.wordIndex || 0),
          previousKey: prevKey,
          nextKey: nextKey,
          isMistake: !!ks.isMistake,
          timestamp: new Date(ks.timestamp || Date.now()),
        };
      });

      await prisma.keystrokeLog.createMany({
        data: formattedKeystrokes,
      });

      // 3. Accumulate Mistake Summaries (Key Confusion Pairs)
      const mistakeKeys = formattedKeystrokes.filter((k) => k.isMistake);
      for (const m of mistakeKeys) {
        await prisma.mistakeSummary.upsert({
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

    // Fetch user for calculations
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // 4. Update Challenges Progress FIRST to determine challenge completions
    const wpmVal = parseFloat(wpm);
    const accuracyVal = parseFloat(accuracy);

    const userChallenges = await prisma.userChallengeProgress.findMany({
      where: { userId, isCompleted: false },
      include: { challenge: true },
    });

    let extraChallengeXp = 0;
    let challengeCompletedThisSession = false;
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

      await prisma.userChallengeProgress.update({
        where: { id: prog.id },
        data: {
          currentValue: currentVal,
          isCompleted: isNowCompleted,
        },
      });

      if (isNowCompleted) {
        extraChallengeXp += ch.xpReward;
        challengeCompletedThisSession = true;
      }
    }

    // 5. Calculate XP Rewards following the exact formula
    const gainedXp = calculateSessionXp(accuracyVal, wpmVal, difficulty || 1);

    // Update streak and longestStreak on session completion
    const newStreak = getUpdatedStreakOnSession(user.lastActiveAt, user.streak);
    const newLongestStreak = Math.max(user.longestStreak, newStreak);

    let newXp = user.xp + gainedXp + extraChallengeXp;
    let newLevel = getLevelFromCumulativeXp(newXp);

    // Recalculate lifetime stats
    const totalSessionsCount = await prisma.typingSession.count({ where: { userId } });
    const allSessions = await prisma.typingSession.findMany({
      where: { userId },
      select: { wpm: true, accuracy: true },
    });

    const avgWpm = allSessions.reduce((sum: number, s: SessionWpmAccuracy) => sum + s.wpm, 0) / totalSessionsCount;
    const avgAccuracy = allSessions.reduce((sum: number, s: SessionWpmAccuracy) => sum + s.accuracy, 0) / totalSessionsCount;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
        level: newLevel,
        streak: newStreak,
        longestStreak: newLongestStreak,
        lastActiveAt: new Date(),
        totalCharacters: { increment: keystrokes.length },
        lifetimeWpm: avgWpm,
        lifetimeAccuracy: avgAccuracy,
        practiceHours: { increment: parseFloat(duration) / 3600 },
      },
    });

    let finalXp = newXp;
    let finalLevel = newLevel;

    // 6. Check and Award Achievements
    const unlockedAchievements: any[] = [];
    const alreadyUnlocked = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });
    const unlockedIds = new Set(alreadyUnlocked.map((a: AchievementIdSelect) => a.achievementId));

    const allAchievements = await prisma.achievement.findMany();

    let achievementXp = 0;
    for (const ach of allAchievements) {
      if (unlockedIds.has(ach.id)) continue;

      let meetsCriteria = false;
      const totalChars = updatedUser.totalCharacters;

      if (ach.code === 'FIRST_SESSION') {
        meetsCriteria = true;
      } else if (ach.code === 'STREAK_3' && updatedUser.streak >= 3) {
        meetsCriteria = true;
      } else if (ach.code === 'STREAK_7' && updatedUser.streak >= 7) {
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
      } else if (ach.code === 'CHARS_10000' && totalChars >= 10000) {
        meetsCriteria = true;
      } else if (ach.code === 'SESSIONS_100' && totalSessionsCount >= 100) {
        meetsCriteria = true;
      }

      if (meetsCriteria) {
        // Prevent duplicate insertions explicitly
        await prisma.userAchievement.upsert({
          where: {
            userId_achievementId: {
              userId,
              achievementId: ach.id,
            }
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

    if (achievementXp > 0) {
      finalXp += achievementXp;
      finalLevel = getLevelFromCumulativeXp(finalXp);
      // Update database one final time
      await prisma.user.update({
        where: { id: userId },
        data: { xp: finalXp, level: finalLevel }
      });
    }

    const isLevelUp = finalLevel > user.level;

    return res.status(201).json({
      session,
      xpGained: gainedXp + extraChallengeXp + achievementXp,
      level: finalLevel,
      xp: finalXp,
      isLevelUp,
      unlockedAchievements,
    });
  } catch (error: unknown) {
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

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

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

