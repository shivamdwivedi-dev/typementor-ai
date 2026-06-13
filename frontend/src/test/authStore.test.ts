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
});
