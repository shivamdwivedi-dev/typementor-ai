import { describe, it, expect, vi } from 'vitest';

// Let's test the streak utility calculation logic directly.
// This ensures that login frequencies correctly manage streak increments and resets.
function getUpdatedStreak(lastActiveAt: Date, currentStreak: number): number {
  const now = new Date();
  const lastActive = new Date(lastActiveAt);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const lastActiveDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());

  if (lastActiveDate.getTime() === today.getTime()) {
    return currentStreak;
  } else if (lastActiveDate.getTime() === yesterday.getTime()) {
    return currentStreak + 1;
  } else {
    return 1;
  }
}

describe('Authentication Streak Logic tests', () => {
  it('should maintain streak if logged in today', () => {
    const today = new Date();
    const streak = getUpdatedStreak(today, 5);
    expect(streak).toBe(5);
  });

  it('should increment streak if last login was yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const streak = getUpdatedStreak(yesterday, 5);
    expect(streak).toBe(6);
  });

  it('should reset streak to 1 if last login was 3 days ago', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const streak = getUpdatedStreak(threeDaysAgo, 5);
    expect(streak).toBe(1);
  });
});
