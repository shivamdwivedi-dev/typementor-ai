import { describe, it, expect } from 'vitest';
import {
  calculateSessionXp,
  getLevelFromCumulativeXp,
  getXpProgress,
  getStreakOnLogin,
  getUpdatedStreakOnSession,
  getStreakCountdownInfo,
} from '../services/gamification.service';

describe('Gamification Service - Streak & Progress', () => {
  it('calculates XP correctly', () => {
    const xp = calculateSessionXp(100, 60, 2);
    // 25 base + 25 acc + 20 wpm + 10 difficulty = 80
    expect(xp).toBe(80);
  });

  it('calculates level and progress from XP', () => {
    expect(getLevelFromCumulativeXp(0)).toBe(1);
    expect(getLevelFromCumulativeXp(499)).toBe(1);
    expect(getLevelFromCumulativeXp(500)).toBe(2);
    expect(getLevelFromCumulativeXp(1050)).toBe(3);

    const prog = getXpProgress(650, 2);
    expect(prog.xpInLevel).toBe(150);
    expect(prog.xpNeededForNext).toBe(500);
    expect(prog.percent).toBe(30);
  });

  describe('getStreakOnLogin', () => {
    it('returns 0 when current streak is 0 or user never practiced', () => {
      expect(getStreakOnLogin(new Date(0), 0)).toBe(0);
      expect(getStreakOnLogin(null, 5)).toBe(0);
      expect(getStreakOnLogin(undefined, 5)).toBe(0);
    });

    it('keeps streak intact when last active was today', () => {
      const today = new Date();
      expect(getStreakOnLogin(today, 7)).toBe(7);
    });

    it('keeps streak intact when last active was yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(getStreakOnLogin(yesterday, 7)).toBe(7);
    });

    it('resets streak to 0 when last active was 2 or more days ago', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      expect(getStreakOnLogin(twoDaysAgo, 7)).toBe(0);
    });
  });

  describe('getUpdatedStreakOnSession', () => {
    it('starts streak at 1 on first session ever', () => {
      expect(getUpdatedStreakOnSession(null, 0)).toBe(1);
      expect(getUpdatedStreakOnSession(new Date(0), 0)).toBe(1);
    });

    it('maintains streak on same-day multiple sessions without double incrementing', () => {
      const today = new Date();
      expect(getUpdatedStreakOnSession(today, 5)).toBe(5);
      // If user had streak 0 and practiced today, ensure it becomes 1
      expect(getUpdatedStreakOnSession(today, 0)).toBe(1);
    });

    it('increments streak when session is completed on consecutive day (yesterday -> today)', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(getUpdatedStreakOnSession(yesterday, 3)).toBe(4);
    });

    it('resets streak to 1 when a day was missed', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      expect(getUpdatedStreakOnSession(threeDaysAgo, 15)).toBe(1);
    });
  });

  describe('getStreakCountdownInfo', () => {
    it('returns extended status when practiced today', () => {
      const today = new Date();
      const info = getStreakCountdownInfo(today, 4);
      expect(info.status).toBe('extended');
      expect(info.isPracticedToday).toBe(true);
      expect(info.isAtRisk).toBe(false);
      expect(info.secondsRemaining).toBeGreaterThan(0);
      expect(info.secondsRemaining).toBeLessThanOrEqual(86400);
    });

    it('returns at_risk status when last practice was yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const info = getStreakCountdownInfo(yesterday, 4);
      expect(info.status).toBe('at_risk');
      expect(info.isPracticedToday).toBe(false);
      expect(info.isAtRisk).toBe(true);
      expect(info.streak).toBe(4);
    });

    it('returns zero status when streak is broken or empty', () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      const info = getStreakCountdownInfo(fourDaysAgo, 4);
      expect(info.status).toBe('zero');
      expect(info.streak).toBe(0);
      expect(info.isPracticedToday).toBe(false);
      expect(info.isAtRisk).toBe(false);
    });
  });
});
