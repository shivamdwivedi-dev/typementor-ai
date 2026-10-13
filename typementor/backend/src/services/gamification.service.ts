/**
 * Shared services for gamification calculations.
 */

export function calculateSessionXp(accuracy: number, wpm: number, difficulty: number): number {
  const baseXp = 25;
  const accuracyBonus = Math.round(accuracy / 4);
  const wpmBonus = Math.min(25, Math.round(wpm / 3));
  const difficultyBonus = difficulty * 5;

  return baseXp + accuracyBonus + wpmBonus + difficultyBonus;
}

export function getLevelFromCumulativeXp(totalXp: number): number {
  const level = Math.floor(totalXp / 500) + 1;
  return Math.max(1, Math.min(100, level));
}

export function getXpProgress(totalXp: number, level: number) {
  // Each level requires exactly 500 XP
  const xpInLevel = totalXp % 500;
  const xpNeededForNext = 500;
  const percent = Math.min(100, Math.max(0, Math.round((xpInLevel / xpNeededForNext) * 100)));
  return {
    xpInLevel,
    xpNeededForNext,
    percent
  };
}

export type StreakActivityType = 'login' | 'session';

/**
 * Shared streak transition function for both login/profile checks ('login')
 * and completed qualifying practice sessions ('session').
 */
export function resolveStreakTransition(
  lastActiveAt: Date | string | null | undefined,
  currentStreak: number,
  activityType: StreakActivityType,
  now: Date = new Date()
): number {
  const safeStreak = Number.isFinite(currentStreak) && currentStreak > 0 ? Math.floor(currentStreak) : 0;

  let lastActiveDate: Date | null = null;
  if (lastActiveAt) {
    const parsed = new Date(lastActiveAt);
    if (!isNaN(parsed.getTime()) && parsed.getTime() > 0) {
      lastActiveDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = lastActiveDate !== null && lastActiveDate.getTime() === today.getTime();
  const isPreviousDay = lastActiveDate !== null && lastActiveDate.getTime() === yesterday.getTime();

  if (activityType === 'login') {
    if (safeStreak === 0 || !lastActiveDate) {
      return 0;
    }
    if (isSameDay || isPreviousDay) {
      return safeStreak;
    }
    return 0;
  }

  // Qualifying practice session completed ('session')
  if (safeStreak === 0 || !lastActiveDate) {
    return 1;
  }
  if (isSameDay) {
    return safeStreak;
  }
  if (isPreviousDay) {
    return safeStreak + 1;
  }
  // Missed one or more calendar days
  return 1;
}

export function getStreakOnLogin(
  lastActiveAt: Date | string | null | undefined,
  currentStreak: number,
  now: Date = new Date()
): number {
  return resolveStreakTransition(lastActiveAt, currentStreak, 'login', now);
}

export function getUpdatedStreakOnSession(
  lastActiveAt: Date | string | null | undefined,
  currentStreak: number,
  now: Date = new Date()
): number {
  return resolveStreakTransition(lastActiveAt, currentStreak, 'session', now);
}

export interface StreakCountdownInfo {
  streak: number;
  isPracticedToday: boolean;
  isAtRisk: boolean;
  expiresAt: string;
  secondsRemaining: number;
  status: 'extended' | 'at_risk' | 'zero';
}

export function getStreakCountdownInfo(
  lastActiveAt: Date | string | null | undefined,
  currentStreak: number,
  now: Date = new Date()
): StreakCountdownInfo {
  const midnightTonight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const secondsRemaining = Math.max(0, Math.floor((midnightTonight.getTime() - now.getTime()) / 1000));

  const effectiveStreak = resolveStreakTransition(lastActiveAt, currentStreak, 'login', now);
  let isPracticedToday = false;

  if (effectiveStreak > 0 && lastActiveAt) {
    const lastActive = new Date(lastActiveAt);
    if (!isNaN(lastActive.getTime()) && lastActive.getTime() > 0) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastActiveDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
      isPracticedToday = lastActiveDate.getTime() === today.getTime();
    }
  }

  if (isPracticedToday) {
    return {
      streak: effectiveStreak,
      isPracticedToday: true,
      isAtRisk: false,
      expiresAt: midnightTonight.toISOString(),
      secondsRemaining,
      status: 'extended'
    };
  } else if (effectiveStreak > 0) {
    return {
      streak: effectiveStreak,
      isPracticedToday: false,
      isAtRisk: true,
      expiresAt: midnightTonight.toISOString(),
      secondsRemaining,
      status: 'at_risk'
    };
  } else {
    return {
      streak: 0,
      isPracticedToday: false,
      isAtRisk: false,
      expiresAt: midnightTonight.toISOString(),
      secondsRemaining,
      status: 'zero'
    };
  }
}


