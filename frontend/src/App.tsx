import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from './store/AuthStore';
import { useTypingStore } from './store/TypingStore';
import TypingEngine from './components/TypingEngine';
import AICoach from './components/AICoach';
import FingerCamera from './components/FingerCamera';
import Dashboard from './pages/Dashboard';
import LearningPath from './components/LearningPath';
import Profile from './pages/Profile';
import AuthPage from './pages/AuthPage';
import InterviewRoom from './pages/InterviewRoom';
import EnduranceArena from './components/EnduranceArena';
import TypingAcademy from './pages/TypingAcademy';
import SoundSettings from './components/SoundSettings';
import AIGuide from './components/AIGuide';
import LandingPage from './pages/LandingPage';
import BetaFeedback from './components/BetaFeedback';
import WelcomeBackCard from './components/WelcomeBackCard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import { getApiUrl, getStorageKey } from './utils/api';
import { getLastActivity, getSmartResumeTarget, ResumeTarget, logResumeAnalytics } from './utils/ResumeTracker';
import { CODING_TEMPLATES } from './utils/codingTemplates';
import { selectNextLesson, extractWeakKeys } from './utils/lessonEngine';
import { showPrToast, registerToastListener, ToastMessage } from './utils/toastHelper';
import {
  Brain, Activity, User as UserIcon, Code, Award,
  LogOut, Flame, Sparkles, Loader2, Menu, X, BookOpen,
  WifiOff, RefreshCw
} from 'lucide-react';

// ── Guest mode is OFF by default. Set VITE_ENABLE_GUEST_MODE=true to enable. ──
const GUEST_MODE_ENABLED = import.meta.env.VITE_ENABLE_GUEST_MODE === 'true';

type Page = 'practice' | 'dashboard' | 'path' | 'profile' | 'interview' | 'endurance' | 'academy' | 'privacy' | 'terms';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('academy');
  const [showAuth, setShowAuth] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const hasShownWelcome = useRef(false);
  const [difficultyAlert, setDifficultyAlert] = useState<string | null>(null);
  const [isGuestSession, setIsGuestSession] = useState(false);
  const [pendingNextDifficulty, setPendingNextDifficulty] = useState(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Register local toast listener
  useEffect(() => {
    const unbind = registerToastListener((updated) => {
      setToasts([...updated]);
    });
    return unbind;
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Preserve weak keys from the last session so the next lesson can target them
  const lastSessionKeystrokes = useRef<{ expectedKey: string; isMistake: boolean }[]>([]);

  const { user, isAuthenticated, isBootstrapping, isOffline, logout, bootstrap, fetchProfile } = useAuthStore();
  const { difficulty, mode, initializeSession } = useTypingStore();

  // ── On mount: validate stored token before rendering anything ──────────────
  useEffect(() => {
    bootstrap();
  }, []);

  // ── After auth confirmed: load the first prompt via lesson engine ────────────
  useEffect(() => {
    if (isAuthenticated || isGuestSession) {
      const lesson = selectNextLesson(1, []);
      initializeSession(lesson.text, 'English', lesson.tier);
    }
  }, [isAuthenticated, isGuestSession]);

  // ── Trigger Welcome Back modal if user has last activity when they are logged in or enter guest mode ──
  useEffect(() => {
    if ((isAuthenticated || isGuestSession) && !hasShownWelcome.current) {
      const lastAct = getLastActivity(user);
      if (lastAct) {
        setShowWelcomeBack(true);
      }
      hasShownWelcome.current = true;
    }
  }, [isAuthenticated, isGuestSession, user]);

  // ── If bootstrapping, show a full-screen loading spinner ──────────────────
  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4">
        <div className="bg-brand-primary p-3 rounded-2xl text-white shadow-lg shadow-brand-primary/30 animate-pulse">
          <Brain className="w-8 h-8" />
        </div>
        <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
        <p className="text-xs text-brand-muted uppercase tracking-widest font-semibold">
          Loading TypeMentor AI…
        </p>
      </div>
    );
  }

  // ── If not authenticated and not in guest session → show LandingPage (or AuthPage if triggered) ─────
  if (!isAuthenticated && !isGuestSession) {
    if (showAuth) {
      return (
        <div className="min-h-screen bg-brand-bg flex flex-col font-sans select-none text-brand-text">
          {/* Minimal header — back to landing page */}
          <header className="border-b border-brand-border bg-brand-card/30 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowAuth(false)}>
              <div className="bg-brand-primary p-2.5 rounded-xl text-white shadow-lg shadow-brand-primary/20">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  TypeMentor <span className="text-brand-primary font-black px-1.5 py-0.5 rounded text-xs bg-brand-primary/10">AI</span>
                </h1>
                <p className="text-[10px] text-brand-muted tracking-wider uppercase font-semibold">Adaptive Typing Coach</p>
              </div>
            </div>
            <button
              onClick={() => setShowAuth(false)}
              className="text-xs text-brand-muted hover:text-white font-semibold border border-brand-border px-3 py-1.5 rounded-lg bg-brand-card/25"
            >
              ← Back
            </button>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
            <AuthPage
              onSuccess={() => {
                setCurrentPage('academy');
              }}
            />

            {/* Continue as Guest — only shown when VITE_ENABLE_GUEST_MODE=true */}
            {GUEST_MODE_ENABLED && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setIsGuestSession(true)}
                  className="text-xs text-brand-muted hover:text-brand-text underline underline-offset-2 transition-colors"
                >
                  Continue as Guest (progress not saved)
                </button>
              </div>
            )}
          </main>

          <footer className="py-6 border-t border-brand-border text-center text-xs text-brand-muted">
            <p>© 2026 TypeMentor AI. All rights reserved.</p>
          </footer>
          <BetaFeedback />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-brand-bg flex flex-col font-sans select-none text-brand-text">
        <header className="border-b border-brand-border bg-brand-card/30 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary p-2.5 rounded-xl text-white shadow-lg shadow-brand-primary/20">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                TypeMentor <span className="text-brand-primary font-black px-1.5 py-0.5 rounded text-xs bg-brand-primary/10">AI</span>
              </h1>
              <p className="text-[10px] text-brand-muted tracking-wider uppercase font-semibold">Adaptive Typing Coach</p>
            </div>
          </div>
          <button
            onClick={() => setShowAuth(true)}
            className="text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/95 px-4 py-2 rounded-xl transition-all border border-indigo-400/40"
          >
            Sign In / Register
          </button>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
          <LandingPage
            onGetStarted={() => setShowAuth(true)}
            onTryAcademy={() => {
              setIsGuestSession(true);
              setCurrentPage('academy');
            }}
            onNavigateToPage={(page) => {
              // Bypass auth requirement check by making it active
              setIsGuestSession(true); 
              setCurrentPage(page);
            }}
          />
        </main>
        <BetaFeedback />
      </div>
    );
  }

  // ── Authenticated (or guest) app shell ────────────────────────────────────

  const handleModeChange = (newMode: string) => {
    if (newMode === 'English') {
      const lesson = selectNextLesson(difficulty, lastSessionKeystrokes.current.length > 0
        ? extractWeakKeys(lastSessionKeystrokes.current)
        : []);
      initializeSession(lesson.text, 'English', lesson.tier);
    } else if (CODING_TEMPLATES[newMode]) {
      const list = CODING_TEMPLATES[newMode];
      // Shuffle via sort for variety
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      initializeSession(shuffled[0].code, newMode, 3);
    }
  };

  const handleCustomLessonGenerate = async (keys: string[]) => {
    const token = localStorage.getItem('typementor_token');
    const keyParam = keys.join(',');
    try {
      const response = await fetch(getApiUrl(`/api/coach/lesson?keys=${keyParam}&difficulty=${difficulty}`), {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      const data = await response.json();
      if (response.ok) {
        initializeSession(data.lesson, mode, data.difficulty, useTypingStore.getState().riskKeys);
        setDifficultyAlert(`Drill compiled for keys: ${keys.join(', ')}`);
        setTimeout(() => setDifficultyAlert(null), 3000);
      }
    } catch {
      const syllables = keys.map(k => `${k.toLowerCase()}${k.toLowerCase()}`).join(' ');
      initializeSession(`${syllables} try tree target write story third`, 'Custom', difficulty);
      setDifficultyAlert(`Drill compiled offline for keys: ${keys.join(', ')}`);
      setTimeout(() => setDifficultyAlert(null), 3000);
    }
  };

  // ── Called by TypingEngine when a session finishes ───────────────────────────
  // Saves data to DB and calculates the next difficulty tier.
  // Does NOT reset the session — the user sees results until they click a button.
  const handleSessionComplete = async (metrics: any) => {
    const token = localStorage.getItem('typementor_token');

    if (isAuthenticated && token) {
      try {
        // Fetch last sessions first to compare personal records
        const preSessionsRes = await fetch(getApiUrl('/api/sessions?limit=20'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        let preSessions: any[] = [];
        if (preSessionsRes.ok) {
          preSessions = await preSessionsRes.json();
        }

        // Filter same-mode runs
        const sameModeRuns = preSessions.filter((s: any) => s.mode === mode);
        const maxWpmBefore = sameModeRuns.length > 0 ? Math.max(...sameModeRuns.map((s: any) => s.wpm)) : 0;
        const maxAccBefore = sameModeRuns.length > 0 ? Math.max(...sameModeRuns.map((s: any) => s.accuracy)) : 0;

        const submitRes = await fetch(getApiUrl('/api/sessions'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            mode,
            difficulty,
            wpm: metrics.wpm,
            rawWpm: metrics.rawWpm,
            accuracy: metrics.accuracy,
            consistency: metrics.consistency,
            focusScore: metrics.focusScore,
            duration: (Date.now() - (useTypingStore.getState().startTime || Date.now())) / 1000,
            backspaceCount: metrics.backspaceCount,
            correctionCount: metrics.correctionCount,
            keystrokes: metrics.keystrokes,
          }),
        });

        if (submitRes.ok) {
          const submitData = await submitRes.json();
          if (submitData.xpGained > 0) {
            showPrToast(`✨ +${submitData.xpGained} XP Earned!`);
          }
          if (submitData.isLevelUp) {
            showPrToast(`🎉 LEVEL UP! You reached Level ${submitData.level}! Keep pushing!`);
          }
          if (submitData.unlockedAchievements && submitData.unlockedAchievements.length > 0) {
            submitData.unlockedAchievements.forEach((ach: any) => {
              showPrToast(`🏅 ACHIEVEMENT UNLOCKED: ${ach.name}!`);
            });
          }
          const todayStr = new Date().toDateString();
          const preTodaySessionsCount = preSessions.filter((s: any) => new Date(s.createdAt).toDateString() === todayStr).length;
          if (preTodaySessionsCount === 2) {
            showPrToast(`🏆 DAILY GOAL COMPLETED! Completed 3 sessions today!`);
          }
        }

        // Trigger New Personal Record Toast if speed or accuracy is beaten
        const beatsWpm = metrics.wpm > maxWpmBefore;
        const beatsAcc = metrics.accuracy > maxAccBefore;
        if (beatsWpm || beatsAcc) {
          let prMsg = '';
          if (beatsWpm && beatsAcc) {
            prMsg = `👑 NEW PERSONAL RECORD! Mode: ${mode} - Best WPM: ${Math.round(metrics.wpm)} & Best Accuracy: ${Math.round(metrics.accuracy)}%!`;
          } else if (beatsWpm) {
            prMsg = `👑 NEW PERSONAL RECORD! Mode: ${mode} - Best WPM: ${Math.round(metrics.wpm)}!`;
          } else {
            prMsg = `👑 NEW PERSONAL RECORD! Mode: ${mode} - Best Accuracy: ${Math.round(metrics.accuracy)}%!`;
          }
          showPrToast(prMsg);
        }

        fetchProfile();
      } catch (e) {
        console.error('Failed to submit session telemetry', e);
      }
    }

    if (isAuthenticated && token && mode === 'Recovery') {
      try {
        const targetKey = useTypingStore.getState().words[0].toUpperCase();
        const totalCharsForKey = (metrics.keystrokes || []).filter((k: any) => k.expectedKey.toUpperCase() === targetKey).length;
        const recoveryLessonErrorRate = totalCharsForKey > 0
          ? ((metrics.keystrokes || []).filter((k: any) => k.expectedKey.toUpperCase() === targetKey && k.isMistake).length / totalCharsForKey) * 100
          : (100 - metrics.accuracy);

        const reportRes = await fetch(getApiUrl('/api/analytics/recovery-report'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (reportRes.ok) {
          const report = await reportRes.json();
          // recoveryScore formula per spec: 100 - targetKeyErrorRate
          const recoveryScore = Math.min(100, Math.max(0, Math.round(100 - recoveryLessonErrorRate)));

          await fetch(getApiUrl('/api/analytics/recovery-score'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              mostMistypedKey: targetKey,
              confusionKey: report.confusionKey || null,
              accuracyLoss: report.accuracyLoss || 0,
              predictedWpmGain: report.predictedWpmGain || 0,
              recoveryScore: recoveryScore,
            })
          });
          setDifficultyAlert(`Targeted Recovery Session Logged! Target Key Accuracy: ${recoveryScore}%`);
          setTimeout(() => setDifficultyAlert(null), 3000);
        }
      } catch (err) {
        console.error('Failed to save recovery score', err);
      }
    }

    // Save weak keys for the next lesson selection
    lastSessionKeystrokes.current = metrics.keystrokes ?? [];

    // Calculate next difficulty — stored so "Next Lesson" uses the right tier
    const acc = metrics.accuracy;
    let nextDiff = difficulty;

    if (acc >= 96 && difficulty < 5) {
      nextDiff = difficulty + 1;
      setDifficultyAlert(`Smart Difficulty UP: Tier ${nextDiff}!`);
      setTimeout(() => setDifficultyAlert(null), 4000);
    } else if (acc <= 85 && difficulty > 1) {
      nextDiff = difficulty - 1;
      setDifficultyAlert(`Smart Difficulty DOWN: Tier ${nextDiff} (Focus Accuracy)`);
      setTimeout(() => setDifficultyAlert(null), 4000);
    }

    setPendingNextDifficulty(nextDiff);
    // ↑ Session stays visible. User must click "Next Lesson" or "Retry" to proceed.
  };

  // ── Called when user explicitly clicks "Next Lesson" in SessionResults ────────
  const handleStartNext = () => {
    const weakKeys = extractWeakKeys(lastSessionKeystrokes.current);

    if (mode === 'English') {
      const lesson = selectNextLesson(pendingNextDifficulty, weakKeys);
      initializeSession(lesson.text, 'English', lesson.tier);
      if (weakKeys.length > 0) {
        setDifficultyAlert(`Targeting weak keys: ${weakKeys.slice(0, 3).join(', ')}`);
        setTimeout(() => setDifficultyAlert(null), 3500);
      }
    } else if (CODING_TEMPLATES[mode]) {
      const list = CODING_TEMPLATES[mode];
      // Pick a different template than the last one (dedup by shuffling)
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      initializeSession(shuffled[0].code, mode, pendingNextDifficulty);
    } else {
      const lesson = selectNextLesson(pendingNextDifficulty, weakKeys);
      initializeSession(lesson.text, 'English', lesson.tier);
    }
  };

  // ── Called when user clicks "View Dashboard" in SessionResults ────────────────
  const handleViewDashboard = () => {
    setCurrentPage('dashboard');
  };

  const handleStartRecoveryPractice = async () => {
    const token = localStorage.getItem('typementor_token');
    try {
      const response = await fetch(getApiUrl('/api/coach/recovery-lesson'), {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      const data = await response.json();
      if (response.ok) {
        // Fetch recovery report to get the baseline error rate
        try {
          const reportRes = await fetch(getApiUrl('/api/analytics/recovery-report'), {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (reportRes.ok) {
            const report = await reportRes.json();
            localStorage.setItem(`recovery_baseline_${data.targetKey.toUpperCase()}`, JSON.stringify({
              baselineErrorRate: report.baselineErrorRate || 25,
              accuracyLoss: report.accuracyLoss || 3.2,
              predictedWpmGain: report.predictedWpmGain || 4
            }));
          }
        } catch (err) {
          console.error('Failed to save recovery baseline', err);
        }

        initializeSession(data.lesson, 'Recovery', data.difficulty, { [data.targetKey.toUpperCase()]: 100 });
        setDifficultyAlert(`Targeted Recovery Compiled for key: ${data.targetKey}`);
        setTimeout(() => setDifficultyAlert(null), 3000);
        setCurrentPage('practice');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResumeJourney = (target: ResumeTarget) => {
    logResumeAnalytics('click');
    (window as any).__typementor_resumed = true;

    if (target.type === 'academy') {
      setCurrentPage('academy');
      if (target.lessonId) {
        (window as any).__typementor_resume_lesson_id = target.lessonId;
        window.dispatchEvent(new CustomEvent('typementor_resume_lesson', { detail: { lessonId: target.lessonId } }));
      }
    } else if (target.type === 'recovery') {
      handleStartRecoveryPractice();
    } else if (target.type === 'endurance') {
      setCurrentPage('endurance');
    } else {
      setCurrentPage('practice');
    }
    setShowWelcomeBack(false);
  };

  const handleLogout = () => {
    logout();
    setIsGuestSession(false);
    setCurrentPage('practice');
  };

  // Guard: redirect to practice if guest tries to access authenticated-only pages
  const safePage: Page = !isAuthenticated && isGuestSession && currentPage !== 'practice' && currentPage !== 'academy'
    ? 'practice'
    : currentPage;

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col font-sans select-none text-brand-text">
      {isOffline && (
        <div className="bg-brand-warning/15 border-b border-brand-warning/45 text-brand-warning px-4 py-3 text-center text-xs flex flex-wrap items-center justify-center gap-3 animate-pulse shadow-lg z-50">
          <div className="flex items-center gap-2 font-extrabold uppercase tracking-wide">
            <WifiOff className="w-4 h-4 text-brand-warning" />
            <span>TypeMentor AI is Offline</span>
          </div>
          <p className="text-[11px] text-brand-muted max-w-xl text-left font-medium">
            The database/analytics server is unreachable. You can continue typing in guest mode (stored locally), but account sync and deep AI diagnostics require an active connection.
          </p>
          <button
            onClick={() => bootstrap()}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-brand-warning hover:bg-brand-warning/90 text-slate-950 font-bold transition-all text-[11px]"
          >
            <RefreshCw className="w-3 h-3" /> Retry Connection
          </button>
        </div>
      )}
      {/* Toast Notification Container Overlay */}
      <div className="fixed bottom-6 right-6 md:top-20 md:right-6 md:bottom-auto z-50 flex flex-col gap-2.5 max-w-md pointer-events-none w-[calc(100%-3rem)] md:w-96">
        {toasts.map((toast) => {
          let borderClass = 'border-brand-primary/60';
          let icon = '✨';
          if (toast.message.includes('LEVEL UP')) {
            borderClass = 'border-brand-warning/80 shadow-brand-warning/20';
            icon = '🎉';
          } else if (toast.message.includes('ACHIEVEMENT')) {
            borderClass = 'border-brand-success/80 shadow-brand-success/20';
            icon = '🏆';
          } else if (toast.message.includes('DAILY GOAL')) {
            borderClass = 'border-brand-warning/80 shadow-brand-warning/20';
            icon = '🏅';
          } else if (toast.message.includes('RECORD')) {
            borderClass = 'border-brand-primary/80 shadow-brand-primary/20';
            icon = '👑';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto bg-slate-950/90 backdrop-blur-md border ${borderClass} px-4 py-3.5 rounded-xl shadow-2xl text-white font-extrabold text-xs flex items-center gap-3 animate-in slide-in-from-right duration-300`}
            >
              <span className="text-xl flex-shrink-0 animate-bounce">{icon}</span>
              <span className="leading-snug text-left">{toast.message}</span>
            </div>
          );
        })}
      </div>

      {/* ── Top Header ── */}
      <header className="border-b border-brand-border bg-brand-card/30 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentPage('practice')}>
          <div className="bg-brand-primary p-2.5 rounded-xl text-white shadow-lg shadow-brand-primary/20">
            <Brain className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                TypeMentor <span className="text-brand-primary font-black px-1.5 py-0.5 rounded text-xs bg-brand-primary/10">AI</span>
              </h1>
              {isOffline && (
                <span className="bg-brand-warning/10 text-brand-warning border border-brand-warning/30 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded animate-pulse">
                  Offline Mode
                </span>
              )}
            </div>
            <p className="text-[10px] text-brand-muted tracking-wider uppercase font-semibold">Adaptive Typing Coach</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          {/* Typing Academy is visible to all */}
          <button
            onClick={() => setCurrentPage('academy')}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
              safePage === 'academy'
                ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15'
                : 'text-brand-muted hover:text-brand-text hover:bg-brand-card/55'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Typing Academy
          </button>

          {/* Practice is visible to all (including guest) */}
          <button
            onClick={() => setCurrentPage('practice')}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
              safePage === 'practice'
                ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15'
                : 'text-brand-muted hover:text-brand-text hover:bg-brand-card/55'
            }`}
          >
            <Code className="w-4 h-4" />
            Practice
          </button>

          {/* Authenticated navigation links */}
          {isAuthenticated && (
            <>
              <button
                onClick={() => setCurrentPage('endurance')}
                className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                  safePage === 'endurance'
                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15'
                    : 'text-brand-muted hover:text-brand-text hover:bg-brand-card/55'
                }`}
              >
                <Activity className="w-4 h-4" />
                Endurance Arena
              </button>

              <button
                onClick={() => setCurrentPage('path')}
                className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                  safePage === 'path'
                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15'
                    : 'text-brand-muted hover:text-brand-text hover:bg-brand-card/55'
                }`}
              >
                <Award className="w-4 h-4" />
                Learning Path
              </button>

              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                  safePage === 'dashboard'
                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15'
                    : 'text-brand-muted hover:text-brand-text hover:bg-brand-card/55'
                }`}
              >
                <Activity className="w-4 h-4" />
                Dashboard
              </button>

              <button
                onClick={() => setCurrentPage('profile')}
                className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                  safePage === 'profile'
                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15'
                    : 'text-brand-muted hover:text-brand-text hover:bg-brand-card/55'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                Profile
              </button>
            </>
          )}

          {/* Sound Settings panel */}
          <SoundSettings />

          <div className="h-6 w-[1px] bg-brand-border mx-2" />

          {/* User greeting + Sign Out — authenticated only */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {(user?.streak ?? 0) > 0 && (
                <span className="text-xs font-bold text-brand-warning hidden sm:flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  {user?.streak}
                </span>
              )}
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-7 h-7 rounded-full border border-brand-primary/40 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-[10px] font-black text-brand-primary">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-brand-muted hidden sm:inline">
                Hi, {user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-lg border border-brand-border bg-brand-card/30 hover:bg-brand-card/80 transition-all font-medium text-sm flex items-center gap-2 text-brand-danger"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            /* Guest session badge */
            isGuestSession && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-brand-muted font-semibold border border-brand-border px-2 py-1 rounded-lg">
                  Guest
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-lg border border-brand-border bg-brand-card/30 hover:bg-brand-card/80 transition-all font-medium text-sm flex items-center gap-2 text-brand-danger"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Exit Guest</span>
                </button>
              </div>
            )
          )}
        </nav>

        {/* Mobile menu button */}
        {(isAuthenticated || isGuestSession) && (
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-brand-border bg-brand-card/30 hover:bg-brand-card/80 transition-all text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
      </header>

      {/* Mobile Drawer Overlay and Menu */}
      {isMobileMenuOpen && (isAuthenticated || isGuestSession) && (
        <div className="fixed inset-0 z-40 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[80vw] h-full bg-brand-bg/95 border-l border-brand-border glass-panel p-6 flex flex-col gap-6 shadow-2xl transition-transform duration-300 transform translate-x-0 overflow-y-auto">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-brand-border pb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-brand-primary" />
                <span className="font-bold text-white text-base">Menu</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-brand-card/85 text-brand-muted hover:text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Streak & Greeting if authenticated */}
            {isAuthenticated && (
              <div className="bg-brand-card/40 border border-brand-border/40 p-3 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full border border-brand-primary/40 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-xs font-black text-brand-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-brand-muted uppercase font-bold">Logged In As</span>
                    <span className="text-sm font-semibold text-white truncate max-w-[120px]">
                      {user?.name}
                    </span>
                  </div>
                </div>
                {(user?.streak ?? 0) > 0 && (
                  <span className="text-xs font-bold text-brand-warning bg-brand-warning/10 px-2 py-1 rounded-lg flex items-center gap-1 flex-shrink-0">
                    <Flame className="w-3.5 h-3.5" />
                    {user?.streak}
                  </span>
                )}
              </div>
            )}

            {/* Nav Links */}
            <nav className="flex flex-col gap-3.5">
              {/* Sound Settings Panel */}
              <div className="bg-brand-card/20 border border-brand-border/30 p-3 rounded-xl flex items-center justify-between gap-2.5">
                <span className="text-xs font-semibold text-brand-muted">Sound Effects</span>
                <SoundSettings />
              </div>

              {/* Typing Academy */}
              <button
                onClick={() => {
                  setCurrentPage('academy');
                  setIsMobileMenuOpen(false);
                }}
                style={{ '--stagger-delay': '75ms' } as React.CSSProperties}
                className={`w-full px-4 py-3.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all duration-200 mobile-nav-item ${
                  safePage === 'academy'
                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/25 border border-indigo-400/40'
                    : 'bg-brand-card/20 border border-brand-border/30 text-brand-muted hover:text-brand-text hover:bg-brand-card/55'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Typing Academy
              </button>

              {/* Practice */}
              <button
                onClick={() => {
                  setCurrentPage('practice');
                  setIsMobileMenuOpen(false);
                }}
                style={{ '--stagger-delay': '100ms' } as React.CSSProperties}
                className={`w-full px-4 py-3.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all duration-200 mobile-nav-item ${
                  safePage === 'practice'
                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/25 border border-indigo-400/40'
                    : 'bg-brand-card/20 border border-brand-border/30 text-brand-muted hover:text-brand-text hover:bg-brand-card/55'
                }`}
              >
                <Code className="w-4 h-4" />
                Practice
              </button>

              {/* Authenticated Links */}
              {isAuthenticated && (
                <>
                  <button
                    onClick={() => {
                      setCurrentPage('endurance');
                      setIsMobileMenuOpen(false);
                    }}
                    style={{ '--stagger-delay': '150ms' } as React.CSSProperties}
                    className={`w-full px-4 py-3.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all duration-200 mobile-nav-item ${
                      safePage === 'endurance'
                        ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/25 border border-indigo-400/40'
                        : 'bg-brand-card/20 border border-brand-border/30 text-brand-muted hover:text-brand-text hover:bg-brand-card/55'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    Endurance Arena
                  </button>

                  <button
                    onClick={() => {
                      setCurrentPage('path');
                      setIsMobileMenuOpen(false);
                    }}
                    style={{ '--stagger-delay': '200ms' } as React.CSSProperties}
                    className={`w-full px-4 py-3.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all duration-200 mobile-nav-item ${
                      safePage === 'path'
                        ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/25 border border-indigo-400/40'
                        : 'bg-brand-card/20 border border-brand-border/30 text-brand-muted hover:text-brand-text hover:bg-brand-card/55'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    Learning Path
                  </button>

                  <button
                    onClick={() => {
                      setCurrentPage('dashboard');
                      setIsMobileMenuOpen(false);
                    }}
                    style={{ '--stagger-delay': '225ms' } as React.CSSProperties}
                    className={`w-full px-4 py-3.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all duration-200 mobile-nav-item ${
                      safePage === 'dashboard'
                        ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/25 border border-indigo-400/40'
                        : 'bg-brand-card/20 border border-brand-border/30 text-brand-muted hover:text-brand-text hover:bg-brand-card/55'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    Dashboard
                  </button>

                  <button
                    onClick={() => {
                      setCurrentPage('profile');
                      setIsMobileMenuOpen(false);
                    }}
                    style={{ '--stagger-delay': '250ms' } as React.CSSProperties}
                    className={`w-full px-4 py-3.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all duration-200 mobile-nav-item ${
                      safePage === 'profile'
                        ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/25 border border-indigo-400/40'
                        : 'bg-brand-card/20 border border-brand-border/30 text-brand-muted hover:text-brand-text hover:bg-brand-card/55'
                    }`}
                  >
                    <UserIcon className="w-4 h-4" />
                    Profile
                  </button>
                </>
              )}

              {/* Sign Out / Exit Guest */}
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                style={{ '--stagger-delay': '300ms' } as React.CSSProperties}
                className="w-full mt-4 px-4 py-3.5 rounded-xl border border-brand-danger/35 bg-brand-danger/10 hover:bg-brand-danger/20 transition-all duration-200 font-medium text-sm flex items-center gap-3 text-brand-danger mobile-nav-item"
              >
                <LogOut className="w-4 h-4" />
                {isGuestSession ? 'Exit Guest' : 'Sign Out'}
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">

        {difficultyAlert && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-brand-primary border border-indigo-400 p-3 rounded-xl text-white font-bold text-xs shadow-2xl z-50 flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4" />
            <span>{difficultyAlert}</span>
          </div>
        )}

        {safePage === 'practice' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Mode selector */}
              <div className="flex flex-wrap items-center gap-2.5 bg-brand-card/30 p-2.5 rounded-xl border border-brand-border/40">
                <span className="text-[10px] text-brand-muted uppercase font-extrabold px-2">Mode:</span>
                {['English', 'Python', 'JavaScript', 'Java', 'SQL'].map(l => (
                  <button
                    key={l}
                    onClick={() => handleModeChange(l)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mode === l ? 'bg-brand-primary text-white' : 'text-brand-muted hover:text-white hover:bg-brand-card/60'
                    }`}
                  >
                    {l}
                  </button>
                ))}
                <div className="h-4 w-[1px] bg-brand-border mx-1 hidden sm:inline" />
                {isAuthenticated && (
                  <button
                    onClick={() => setCurrentPage('interview')}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-brand-danger bg-brand-danger/10 border border-brand-danger/20 hover:bg-brand-danger/20"
                  >
                    Pressure Interview
                  </button>
                )}
              </div>

              <TypingEngine
                onSessionComplete={handleSessionComplete}
                onStartNext={handleStartNext}
                onViewDashboard={handleViewDashboard}
                onStartRecoveryPractice={handleStartRecoveryPractice}
                onNavigateToAcademy={() => setCurrentPage('academy')}
              />
            </div>

            <div className="lg:col-span-1 space-y-6">
              <AICoach onGenerateCustomLesson={handleCustomLessonGenerate} />
              <FingerCamera />
            </div>
          </div>
        )}

        {safePage === 'dashboard' && isAuthenticated && (
          <Dashboard
            onStartRecoveryPractice={handleStartRecoveryPractice}
            onContinueJourney={handleResumeJourney}
          />
        )}

        {safePage === 'path' && isAuthenticated && (
          <LearningPath
            currentLevel={user?.level ?? 1}
            onSelectNode={() => setCurrentPage('practice')}
          />
        )}

        {safePage === 'profile' && isAuthenticated && <Profile />}

        {safePage === 'endurance' && isAuthenticated && <EnduranceArena />}

        {safePage === 'interview' && isAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-6">
            <button
              onClick={() => setCurrentPage('practice')}
              className="text-xs text-brand-primary font-bold hover:underline mb-2"
            >
              ← Back to Practice Board
            </button>
            <InterviewRoom />
          </div>
        )}
        {safePage === 'academy' && <TypingAcademy />}
        {safePage === 'privacy' && <PrivacyPolicy onBack={() => setCurrentPage('academy')} />}
        {safePage === 'terms' && <TermsOfService onBack={() => setCurrentPage('academy')} />}
      </main>

      <footer className="py-6 border-t border-brand-border text-center text-xs text-brand-muted space-y-2">
        <div className="flex justify-center gap-4 text-[11px]">
          <button onClick={() => setCurrentPage('privacy')} className="hover:text-white hover:underline transition-colors">Privacy Policy</button>
          <span>•</span>
          <button onClick={() => setCurrentPage('terms')} className="hover:text-white hover:underline transition-colors">Terms of Service</button>
        </div>
        <p>© 2026 TypeMentor AI. All rights reserved. Adaptive keystroke analytics model v1.0.0.</p>
      </footer>

      {isAuthenticated && (
        <AIGuide currentPage={currentPage} setCurrentPage={setCurrentPage} />
      )}
      {showWelcomeBack && (
        <WelcomeBackCard
          userName={user?.name || 'Guest'}
          lastActivity={getLastActivity(user)}
          resumeTarget={getSmartResumeTarget(
            localStorage.getItem(getStorageKey('academy_completed_lessons', user?.id)) ? JSON.parse(localStorage.getItem(getStorageKey('academy_completed_lessons', user?.id))!) : [],
            'None',
            user
          )}
          completedCount={localStorage.getItem(getStorageKey('academy_completed_lessons', user?.id)) ? JSON.parse(localStorage.getItem(getStorageKey('academy_completed_lessons', user?.id))!).length : 0}
          totalLessons={50}
          onContinue={() => {
            const completed = localStorage.getItem(getStorageKey('academy_completed_lessons', user?.id)) ? JSON.parse(localStorage.getItem(getStorageKey('academy_completed_lessons', user?.id))!) : [];
            const target = getSmartResumeTarget(completed, 'None', user);
            handleResumeJourney(target);
          }}
          onClose={() => setShowWelcomeBack(false)}
        />
      )}
      <BetaFeedback />
    </div>
  );
}
