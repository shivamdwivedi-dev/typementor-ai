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

export function getStreakOnLogin(lastActiveAt: Date, currentStreak: number): number {
  const now = new Date();
  const lastActive = new Date(lastActiveAt);

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

export function getUpdatedStreakOnSession(lastActiveAt: Date, currentStreak: number): number {
  const now = new Date();
  const lastActive = new Date(lastActiveAt);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const lastActiveDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());

  if (lastActiveDate.getTime() === today.getTime()) {
    // Already completed a session today, streak stays the same
    return currentStreak;
  } else if (lastActiveDate.getTime() === yesterday.getTime()) {
    // Active yesterday, increment streak
    return currentStreak + 1;
  } else {
    // Missed a day (or first session), reset/start streak at 1
    return 1;
  }
}
