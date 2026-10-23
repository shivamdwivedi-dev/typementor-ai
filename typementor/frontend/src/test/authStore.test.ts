import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/AuthStore';

describe('AuthStore Zustand Store', () => {
  beforeEach(() => {
    // Reset state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('should start with initial values', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should clear error on clearError call', () => {
    useAuthStore.setState({ error: 'Auth failed' });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('should clear token and user details on logout', () => {
    useAuthStore.setState({
      token: 'mock-token-xyz',
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Tester',
        level: 1,
        xp: 100,
        streak: 3,
        longestStreak: 3,
        totalCharacters: 0,
        lifetimeWpm: 0,
        lifetimeAccuracy: 0,
        practiceHours: 0,
        createdAt: new Date().toISOString(),
      },
      isAuthenticated: true,
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should reactively update user stats on updateUserStats call', () => {
    useAuthStore.setState({
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Tester',
        level: 1,
        xp: 100,
        streak: 3,
        longestStreak: 3,
        totalCharacters: 50,
        lifetimeWpm: 45,
        lifetimeAccuracy: 95,
        practiceHours: 0.1,
        createdAt: new Date().toISOString(),
      },
      isAuthenticated: true,
    });

    useAuthStore.getState().updateUserStats({
      xp: 180,
      level: 2,
      streak: 4,
      totalCharacters: 120,
    });

    const state = useAuthStore.getState();
    expect(state.user?.xp).toBe(180);
    expect(state.user?.level).toBe(2);
    expect(state.user?.streak).toBe(4);
    expect(state.user?.totalCharacters).toBe(120);
    expect(state.user?.name).toBe('Tester'); // original fields preserved
  });

  it('should immediately reflect optimistic metric changes without waiting for server response', () => {
    useAuthStore.setState({
      user: {
        id: 'user-xyz',
        email: 'speed@typementor.ai',
        name: 'Flash',
        level: 5,
        xp: 2200,
        streak: 10,
        longestStreak: 12,
        totalCharacters: 15000,
        lifetimeWpm: 82,
        lifetimeAccuracy: 97,
        practiceHours: 4.5,
        createdAt: new Date().toISOString(),
      },
      isAuthenticated: true,
    });

    // Simulate optimistic finish of a 95 WPM session
    useAuthStore.getState().updateUserStats({
      xp: 2320,
      level: 5,
      totalCharacters: 15250,
      lifetimeWpm: 83.3,
      lifetimeAccuracy: 97.2,
      practiceHours: 4.52,
    });

    const updated = useAuthStore.getState().user;
    expect(updated?.xp).toBe(2320);
    expect(updated?.totalCharacters).toBe(15250);
    expect(updated?.lifetimeWpm).toBe(83.3);
    expect(updated?.lifetimeAccuracy).toBe(97.2);
  });
});

