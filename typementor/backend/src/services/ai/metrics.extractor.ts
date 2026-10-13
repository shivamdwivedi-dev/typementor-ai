import { prisma } from '../../app';
import { CoachInputMetrics, MistakePattern, MistakeSpeedPattern, PerformanceTrend } from './types';

/**
 * Extracts and synthesizes deterministic analytics metrics for AI coaching.
 * - Queries only the required records and aggregate shapes.
 * - Does not send raw keystroke histories or personally identifying information (PII).
 * - Handles new, null, zero, or missing telemetry safely.
 */
export async function extractCoachMetrics(userId: string): Promise<CoachInputMetrics | null> {
  // 1. Fetch user profile (excluding email, passwordHash, and googleId)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      lifetimeWpm: true,
      lifetimeAccuracy: true,
      practiceHours: true,
      totalCharacters: true,
    },
  });

  if (!user) {
    return null;
  }

  // 2. Fetch top 5 mistake summaries
  const commonMistakes = await prisma.mistakeSummary.findMany({
    where: { userId },
    orderBy: { count: 'desc' },
    take: 5,
    select: {
      expectedKey: true,
      pressedKey: true,
      count: true,
    },
  });

  const totalMistakesCount = commonMistakes.reduce((sum, m) => sum + m.count, 0);
  const topMistakes: MistakePattern[] = commonMistakes.map((m) => ({
    expectedKey: m.expectedKey,
    pressedKey: m.pressedKey,
    count: m.count,
  }));

  // 3. Fetch recent session aggregates (bounded to latest 5 sessions)
  const recentSessions = await prisma.typingSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      wpm: true,
      accuracy: true,
      consistency: true,
      createdAt: true,
    },
  });

  const totalSessionsCount = await prisma.typingSession.count({
    where: { userId },
  });

  // Calculate session averages
  let recentAverageWpm = user.lifetimeWpm || 0;
  let recentAverageAccuracy = user.lifetimeAccuracy || 0;
  let recentAverageConsistency = 80;

  if (recentSessions.length > 0) {
    const sumWpm = recentSessions.reduce((acc, s) => acc + s.wpm, 0);
    const sumAcc = recentSessions.reduce((acc, s) => acc + s.accuracy, 0);
    const sumCons = recentSessions.reduce((acc, s) => acc + (s.consistency || 80), 0);
    recentAverageWpm = Math.round((sumWpm / recentSessions.length) * 10) / 10;
    recentAverageAccuracy = Math.round((sumAcc / recentSessions.length) * 10) / 10;
    recentAverageConsistency = Math.round((sumCons / recentSessions.length) * 10) / 10;
  }

  // Calculate recent performance trend
  let recentTrend: PerformanceTrend = 'insufficient_data';
  if (recentSessions.length >= 3) {
    const newest = recentSessions[0].wpm;
    const oldest = recentSessions[recentSessions.length - 1].wpm;
    const diff = newest - oldest;
    if (diff >= 3) {
      recentTrend = 'improving';
    } else if (diff <= -3) {
      recentTrend = 'declining';
    } else {
      recentTrend = 'plateauing';
    }
  }

  // 4. Analyze mistake reaction times (query only mistake reaction times, bounded to 100)
  let fastMistakesCount = 0;
  let slowMistakesCount = 0;

  if (totalMistakesCount > 0) {
    const mistakeKeystrokes = await prisma.keystrokeLog.findMany({
      where: {
        session: { userId },
        isMistake: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
      select: {
        reactionTime: true,
      },
    });

    for (const ks of mistakeKeystrokes) {
      if (ks.reactionTime < 120) {
        fastMistakesCount++;
      } else {
        slowMistakesCount++;
      }
    }
  }

  let speedPattern: MistakeSpeedPattern = 'balanced';
  if (fastMistakesCount > slowMistakesCount && fastMistakesCount >= 3) {
    speedPattern = 'fast_mistakes';
  } else if (slowMistakesCount > fastMistakesCount && slowMistakesCount >= 3) {
    speedPattern = 'placement_confusion';
  }

  return {
    userId: user.id,
    displayName: user.name || 'Typist',
    lifetimeWpm: user.lifetimeWpm || 0,
    lifetimeAccuracy: user.lifetimeAccuracy || 0,
    practiceHours: user.practiceHours || 0,
    totalSessions: totalSessionsCount,
    topMistakes,
    totalMistakesCount,
    speedPattern,
    fastMistakesCount,
    slowMistakesCount,
    recentTrend,
    recentAverageWpm,
    recentAverageAccuracy,
    recentAverageConsistency,
  };
}
