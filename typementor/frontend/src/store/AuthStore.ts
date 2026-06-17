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
  academyProgress?: string;
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

// Helper to sync database academy progress to localStorage and migrate guest progress
async function syncAndMigrateAcademyProgress(user: any, token: string) {
  if (!user || !user.id) return;

  const userCompletedKey = `academy_completed_lessons_${user.id}`;
  const userResultsKey = `academy_lesson_results_${user.id}`;
  const userIntermediateUnlockedKey = `academy_intermediate_unlocked_${user.id}`;
  const userTestUnlockedKey = `academy_test_unlocked_${user.id}`;

  const guestCompletedKey = 'academy_completed_lessons_guest';
  const guestResultsKey = 'academy_lesson_results_guest';
  const guestIntermediateUnlockedKey = 'academy_intermediate_unlocked_guest';
  const guestTestUnlockedKey = 'academy_test_unlocked_guest';

  // 1. Check if guest progress exists and needs migration
  const guestCompletedStr = localStorage.getItem(guestCompletedKey);
  const guestCompleted = guestCompletedStr ? JSON.parse(guestCompletedStr) : [];

  if (Array.isArray(guestCompleted) && guestCompleted.length > 0) {
    // We have guest progress! Let's migrate it
    const guestResultsStr = localStorage.getItem(guestResultsKey);
    const guestResults = guestResultsStr ? JSON.parse(guestResultsStr) : {};

    const guestIntermediateUnlocked = localStorage.getItem(guestIntermediateUnlockedKey) === 'true';
    const guestTestUnlocked = localStorage.getItem(guestTestUnlockedKey) === 'true';

    // Merge/overwrite user storage with guest progress
    let dbCompleted: number[] = [];
    let dbResults: any = {};
    if (user.academyProgress) {
      try {
        const parsed = JSON.parse(user.academyProgress);
        dbCompleted = parsed.completed || [];
        dbResults = parsed.results || {};
      } catch (e) {
        console.warn('Failed to parse DB academy progress during migration:', e);
      }
    }

    const mergedCompleted = [...new Set([...dbCompleted, ...guestCompleted])];
    const mergedResults = { ...dbResults, ...guestResults };

    // Update user's localStorage
    localStorage.setItem(userCompletedKey, JSON.stringify(mergedCompleted));
    localStorage.setItem(userResultsKey, JSON.stringify(mergedResults));
    if (guestIntermediateUnlocked || mergedCompleted.includes(30) || Array.from({ length: 30 }, (_, i) => i + 1).every((id: any) => mergedCompleted.includes(id))) {
      localStorage.setItem(userIntermediateUnlockedKey, 'true');
    }
    if (guestTestUnlocked || mergedCompleted.includes(50) || Array.from({ length: 20 }, (_, i) => i + 31).every((id: any) => mergedCompleted.includes(id))) {
      localStorage.setItem(userTestUnlockedKey, 'true');
    }

    // Clear guest storage so we don't migrate again
    localStorage.removeItem(guestCompletedKey);
    localStorage.removeItem(guestResultsKey);
    localStorage.removeItem(guestIntermediateUnlockedKey);
    localStorage.removeItem(guestTestUnlockedKey);

    // Sync merged progress to the database
    try {
      await fetch(getApiUrl('/api/auth/profile/academy'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          progress: {
            completed: mergedCompleted,
            results: mergedResults,
          },
        }),
      });
      console.log('Successfully migrated guest progress to user account in database');
    } catch (err) {
      console.error('Failed to sync migrated progress to database:', err);
    }
  } else {
    // 2. No guest progress to migrate.
    // Let's check if the user has local progress that is NOT in the database yet,
    // or if the database progress is more up-to-date.
    const userCompletedStr = localStorage.getItem(userCompletedKey);
    const userCompleted = userCompletedStr ? JSON.parse(userCompletedStr) : [];

    const userResultsStr = localStorage.getItem(userResultsKey);
    const userResults = userResultsStr ? JSON.parse(userResultsStr) : {};

    let dbCompleted: number[] = [];
    let dbResults: any = {};
    if (user.academyProgress) {
      try {
        const parsed = JSON.parse(user.academyProgress);
        dbCompleted = parsed.completed || [];
        dbResults = parsed.results || {};
      } catch (e) {
        console.warn('Failed to parse DB academy progress:', e);
      }
    }

    // If local progress exists but database progress is empty/null, sync local to DB
    if (userCompleted.length > 0 && dbCompleted.length === 0) {
      try {
        await fetch(getApiUrl('/api/auth/profile/academy'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            progress: {
              completed: userCompleted,
              results: userResults,
            },
          }),
        });
        console.log('Successfully synced existing local progress to database');
      } catch (err) {
        console.error('Failed to sync existing local progress to database:', err);
      }
    } else if (user.academyProgress || userCompleted.length > 0) {
      // Merge database progress and local progress together to avoid losing anything
      const mergedCompleted = [...new Set([...dbCompleted, ...userCompleted])];
      const mergedResults = { ...dbResults, ...userResults };

      localStorage.setItem(userCompletedKey, JSON.stringify(mergedCompleted));
      localStorage.setItem(userResultsKey, JSON.stringify(mergedResults));

      // Unlock milestones based on completed lessons
      const isBeginnerCompleted = mergedCompleted.includes(30) || Array.from({ length: 30 }, (_, i) => i + 1).every((id: any) => mergedCompleted.includes(id));
      if (isBeginnerCompleted || mergedCompleted.some(id => id >= 31)) {
        localStorage.setItem(userIntermediateUnlockedKey, 'true');
      }
      const isIntermediateCompleted = mergedCompleted.includes(50) || Array.from({ length: 20 }, (_, i) => i + 31).every((id: any) => mergedCompleted.includes(id));
      if (isIntermediateCompleted || mergedCompleted.some(id => id >= 51)) {
        localStorage.setItem(userTestUnlockedKey, 'true');
      }

      // If local progress was merged and had new additions, sync the merged back to DB
      if (mergedCompleted.length > dbCompleted.length) {
        try {
          await fetch(getApiUrl('/api/auth/profile/academy'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              progress: {
                completed: mergedCompleted,
                results: mergedResults,
              },
            }),
          });
          console.log('Successfully synced merged local/DB progress to database');
        } catch (err) {
          console.error('Failed to sync merged progress back to DB:', err);
        }
      }
    }
  }
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
        await syncAndMigrateAcademyProgress(data, savedToken);
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

      await syncAndMigrateAcademyProgress(data, token);
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
