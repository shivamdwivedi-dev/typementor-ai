import { create } from 'zustand';
import { getApiUrl } from '../utils/api';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  level: number;
  xp: number;
  streak: number;
  longestStreak: number;
  avatar?: string;
  totalCharacters: number;
  lifetimeWpm: number;
  lifetimeAccuracy: number;
  practiceHours: number;
  typingDna?: string;
  lastActivity?: string;
  createdAt: string;
  achievements?: Array<{
    id: string;
    achievement: {
      code: string;
      name: string;
      description: string;
      icon: string;
      category: string;
      xpReward: number;
    };
    unlockedAt: string;
  }>;
  challenges?: Array<{
    id: string;
    currentValue: number;
    isCompleted: boolean;
    challenge: {
      id: string;
      type: string;
      title: string;
      description: string;
      criteriaType: string;
      targetValue: number;
      xpReward: number;
    };
  }>;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isOffline: boolean;
  // true while we are validating a stored token on startup
  isBootstrapping: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  logout: () => void;
  // Called once on app mount to validate any stored token
  bootstrap: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
  setOffline: (offline: boolean) => void;
}

const TOKEN_KEY = 'typementor_token';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isOffline: false,
  // Start true so the app waits for token validation before rendering
  isBootstrapping: true,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),
  setOffline: (offline: boolean) => set({ isOffline: offline }),

  // ── Validate stored token on app startup ──────────────────────────────────
  bootstrap: async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);

    if (!savedToken) {
      // No token at all — go straight to auth
      set({ isBootstrapping: false, isAuthenticated: false, isOffline: false });
      return;
    }

    // Token exists — verify it is still valid by hitting /profile
    try {
      const response = await fetch(getApiUrl('/api/auth/profile'), {
        headers: { Authorization: `Bearer ${savedToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        set({
          token: savedToken,
          user: data,
          isAuthenticated: true,
          isBootstrapping: false,
          isOffline: false,
        });
      } else {
        if (response.status === 401 || response.status === 403 || response.status === 444) {
          // Token is expired, invalid, or belongs to a deleted user — purge it
          localStorage.removeItem(TOKEN_KEY);
          set({ token: null, user: null, isAuthenticated: false, isBootstrapping: false, isOffline: false });
        } else {
          // Server error (500, etc.) — do NOT delete token, assume offline/temporary issue
          set({
            token: savedToken,
            isAuthenticated: true,
            isBootstrapping: false,
            isOffline: true,
          });
        }
      }
    } catch {
      // Network error / offline — do NOT delete token
      set({
        token: savedToken,
        isAuthenticated: true,
        isBootstrapping: false,
        isOffline: true,
      });
    }
  },

  // ── Login ─────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed. Check your credentials.');
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        isOffline: false,
        error: null,
      });

      // Fetch full profile (achievements, challenges, etc.)
      await get().fetchProfile();
      return true;
    } catch (err: unknown) {
      const isNetwork = err instanceof TypeError || (err instanceof Error && err.message.toLowerCase().includes('failed to fetch'));
      if (isNetwork) {
        set({ isOffline: true });
      }
      const message = err instanceof Error ? err.message : 'Login failed.';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // ── Register ──────────────────────────────────────────────────────────────
  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        isOffline: false,
        error: null,
      });

      await get().fetchProfile();
      return true;
    } catch (err: unknown) {
      const isNetwork = err instanceof TypeError || (err instanceof Error && err.message.toLowerCase().includes('failed to fetch'));
      if (isNetwork) {
        set({ isOffline: true });
      }
      const message = err instanceof Error ? err.message : 'Registration failed.';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // ── Google Login ──────────────────────────────────────────────────────────
  loginWithGoogle: async (idToken) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(getApiUrl('/api/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Google login failed. Please try again.');
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        isOffline: false,
        error: null,
      });

      await get().fetchProfile();
      return true;
    } catch (err: unknown) {
      const isNetwork = err instanceof TypeError || (err instanceof Error && err.message.toLowerCase().includes('failed to fetch'));
      if (isNetwork) {
        set({ isOffline: true });
      }
      const message = err instanceof Error ? err.message : 'Google login failed. Please try again.';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null, isAuthenticated: false, error: null });
  },

  // ── Refresh profile data ──────────────────────────────────────────────────
  fetchProfile: async () => {
    const { token } = get();
    if (!token) return;

    set({ isLoading: true });
    try {
      const response = await fetch(getApiUrl('/api/auth/profile'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        // 401, 403, or 444 — token is invalid/expired/deleted, force logout
        if (response.status === 401 || response.status === 403 || response.status === 444) {
          get().logout();
          return;
        }
        throw new Error(data.error || 'Failed to fetch profile.');
      }

      set({ user: data, isLoading: false, isOffline: false });
    } catch (err: unknown) {
      const isNetwork = err instanceof TypeError || (err instanceof Error && err.message.toLowerCase().includes('failed to fetch'));
      if (isNetwork) {
        set({ isOffline: true });
      }
      const message = err instanceof Error ? err.message : 'Profile fetch failed.';
      set({ error: message, isLoading: false });
    }
  },
}));
