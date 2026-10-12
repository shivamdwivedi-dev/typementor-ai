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

export function getStreakOnLogin(lastActiveAt: Date | string | null | undefined, currentStreak: number): number {
  if (!lastActiveAt || currentStreak <= 0) return 0;
  const lastActive = new Date(lastActiveAt);
  if (isNaN(lastActive.getTime()) || lastActive.getTime() === 0) return 0;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const lastActiveDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());

  if (lastActiveDate.getTime() === today.getTime() || lastActiveDate.getTime() === yesterday.getTime()) {
    // Session completed today or yesterday, streak is still active
    return currentStreak;
  } else {
    // Missed a day, streak is broken
    return 0;
  }
}

export function getUpdatedStreakOnSession(lastActiveAt: Date | string | null | undefined, currentStreak: number): number {
  if (!lastActiveAt) return 1;
  const lastActive = new Date(lastActiveAt);
  if (isNaN(lastActive.getTime()) || lastActive.getTime() === 0) return 1;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const lastActiveDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());

  if (lastActiveDate.getTime() === today.getTime()) {
    // Already completed a session today, ensure streak is at least 1 and stays current
    return Math.max(1, currentStreak);
  } else if (lastActiveDate.getTime() === yesterday.getTime()) {
    // Active yesterday, increment streak
    return currentStreak + 1;
  } else {
    // Missed a day (or new streak), reset/start streak at 1
    return 1;
  }
}

export interface StreakCountdownInfo {
  streak: number;
  isPracticedToday: boolean;
  isAtRisk: boolean;
  expiresAt: string;
  secondsRemaining: number;
  status: 'extended' | 'at_risk' | 'zero';
}

export function getStreakCountdownInfo(lastActiveAt: Date | string | null | undefined, currentStreak: number): StreakCountdownInfo {
  const now = new Date();
  const midnightTonight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const secondsRemaining = Math.max(0, Math.floor((midnightTonight.getTime() - now.getTime()) / 1000));

  let isPracticedToday = false;
  let isPracticedYesterday = false;

  if (lastActiveAt) {
    const lastActive = new Date(lastActiveAt);
    if (!isNaN(lastActive.getTime()) && lastActive.getTime() > 0) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastActiveDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());

      isPracticedToday = lastActiveDate.getTime() === today.getTime();
      isPracticedYesterday = lastActiveDate.getTime() === yesterday.getTime();
    }
  }

  const effectiveStreak = isPracticedToday || isPracticedYesterday ? currentStreak : 0;

  if (isPracticedToday) {
    return {
      streak: Math.max(1, effectiveStreak),
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

