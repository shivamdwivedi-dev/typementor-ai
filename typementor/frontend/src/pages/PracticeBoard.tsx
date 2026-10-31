import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTypingStore } from '../store/TypingStore';
import { useAuthStore } from '../store/AuthStore';
import TypingEngine from '../components/TypingEngine';
const AICoach = React.lazy(() => import('../components/AICoach'));
import { getApiUrl, getStorageKey } from '../utils/api';
import { CODING_TEMPLATES } from '../utils/codingTemplates';
import { selectNextLesson, extractWeakKeys, getPromptForWordCount } from '../utils/lessonEngine';
import { showPrToast } from '../utils/toastHelper';
import TypingFingerGuide from '../components/TypingFingerGuide';
import GuestLoginGateModal from '../components/GuestLoginGateModal';
import DailyGoalTracker, { recordDailyPracticeSeconds } from '../components/DailyGoalTracker';
import { Sparkles, Zap, Maximize2, Minimize2, X, Bot, Eye, EyeOff, Lock } from 'lucide-react';

type WordCountOption = 'full' | 15 | 25 | 50 | 100;

export default function PracticeBoard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, difficulty, initializeSession, words, currentIndex, keystrokes, isActive, isCompleted } = useTypingStore();
  const { isAuthenticated } = useAuthStore();

  const [difficultyAlert, setDifficultyAlert] = useState<string | null>(null);
  const [pendingNextDifficulty, setPendingNextDifficulty] = useState(difficulty);
  const lastSessionKeystrokes = useRef<{ expectedKey: string; isMistake: boolean }[]>([]);

  // ── Free Guest Preview Tracking & Hard Registration Gate ──
  const [guestTestsCompleted, setGuestTestsCompleted] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('typementor_guest_tests_count') || '0', 10);
    } catch {
      return 0;
    }
  });

  const [lastGuestMetrics, setLastGuestMetrics] = useState<{ wpm: number; accuracy: number }>(() => {
    try {
      const cached = localStorage.getItem('typementor_pending_guest_stats');
      if (cached) return JSON.parse(cached);
    } catch {}
    return { wpm: 0, accuracy: 0 };
  });

  const [showGuestLoginGate, setShowGuestLoginGate] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isAuth = useAuthStore.getState().isAuthenticated;
    const count = parseInt(localStorage.getItem('typementor_guest_tests_count') || '0', 10);
    return !isAuth && count >= 2;
  });

  // Ensure guest session flag is active so layout and public navigation operate cleanly
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('typementor_is_guest', 'true');
    }
  }, [isAuthenticated]);

  // Word count & customization states
  const [wordCount, setWordCount] = useState<WordCountOption>(() => {
    const saved = localStorage.getItem('typementor_practice_word_count');
    if (saved === '15') return 15;
    if (saved === '25') return 25;
    if (saved === '50') return 50;
    if (saved === '100') return 100;
    return 'full';
  });

  // Always start in standard mode on page load so the user is never trapped in stuck state
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  const [showHandsGuide, setShowHandsGuide] = useState<boolean>(() => {
    return localStorage.getItem('typementor_show_hands') !== 'false';
  });

  const [showAICoach, setShowAICoach] = useState<boolean>(() => {
    return localStorage.getItem('typementor_show_coach') !== 'false';
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Clear any legacy stuck zen state from localStorage
  useEffect(() => {
    localStorage.removeItem('typementor_zen_focus');
  }, []);

  // Lock body scroll while Zen Mode is active
  useEffect(() => {
    if (isZenMode) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isZenMode]);

  // Fullscreen tracking
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleToggleZen = useCallback((nextState?: boolean) => {
    setIsZenMode(prev => {
      const next = typeof nextState === 'boolean' ? nextState : !prev;
      return next;
    });
  }, []);

  const handleToggleHands = () => {
    setShowHandsGuide(prev => {
      const next = !prev;
      localStorage.setItem('typementor_show_hands', String(next));
      return next;
    });
  };

  const handleToggleAICoach = () => {
    setShowAICoach(prev => {
      const next = !prev;
      localStorage.setItem('typementor_show_coach', String(next));
      return next;
    });
  };

  // Keyboard listener: Escape exits Zen mode reliably anytime
  useEffect(() => {
    if (!isZenMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleToggleZen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode, handleToggleZen]);

  // Initial prompt setup if empty
  useEffect(() => {
    if (!words || words.length === 0) {
      if (wordCount !== 'full') {
        const prompt = getPromptForWordCount(wordCount as number, difficulty, []);
        initializeSession(prompt.text, 'English', prompt.tier);
      } else {
        const lesson = selectNextLesson(difficulty, []);
        initializeSession(lesson.text, 'English', lesson.tier);
      }
    }
  }, [words, initializeSession, difficulty, wordCount]);

  // Check if we navigated here with a request to start recovery
  useEffect(() => {
    if (location.state?.startRecovery) {
      handleStartRecoveryPractice();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const handleModeChange = (newMode: string) => {
    if (!isAuthenticated && guestTestsCompleted >= 2) {
      setShowGuestLoginGate(true);
      return;
    }

    if (newMode === 'English') {
      const weakKeys = lastSessionKeystrokes.current.length > 0
        ? extractWeakKeys(lastSessionKeystrokes.current)
        : [];

      if (wordCount !== 'full') {
        const prompt = getPromptForWordCount(wordCount as number, difficulty, weakKeys);
        initializeSession(prompt.text, 'English', prompt.tier);
      } else {
        const lesson = selectNextLesson(difficulty, weakKeys);
        initializeSession(lesson.text, 'English', lesson.tier);
      }
    } else if (CODING_TEMPLATES[newMode]) {
      const list = CODING_TEMPLATES[newMode];
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      initializeSession(shuffled[0].code, newMode, 3);
    }
  };

  const handleWordCountChange = (count: WordCountOption) => {
    if (!isAuthenticated && guestTestsCompleted >= 2) {
      setShowGuestLoginGate(true);
      return;
    }

    setWordCount(count);
    localStorage.setItem('typementor_practice_word_count', String(count));

    if (mode === 'English') {
      const weakKeys = lastSessionKeystrokes.current.length > 0
        ? extractWeakKeys(lastSessionKeystrokes.current)
        : [];

      if (count === 'full') {
        const lesson = selectNextLesson(difficulty, weakKeys);
        initializeSession(lesson.text, 'English', lesson.tier);
      } else {
        const prompt = getPromptForWordCount(count, difficulty, weakKeys);
        initializeSession(prompt.text, 'English', prompt.tier);
      }
    } else {
      setDifficultyAlert(`Coding modes use standardized code syntax blocks`);
      setTimeout(() => setDifficultyAlert(null), 2500);
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

  const handleSessionComplete = async (metrics: any) => {
    const token = localStorage.getItem('typementor_token');
    const sessionStart = useTypingStore.getState().startTime || Date.now();
    const durationSec = Math.max(0.1, (Date.now() - sessionStart) / 1000);
    const idempotencyKey = `practice-${sessionStart}-${mode}-${metrics.keystrokes?.length || 0}`;

    // ── 1. Optimistic Update (0ms latency) ─────────────
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      const gainedChars = metrics.keystrokes?.length || 0;
      const baseDifficultyMultiplier = difficulty === 1 ? 1.0 : difficulty === 2 ? 1.2 : difficulty === 3 ? 1.4 : difficulty === 4 ? 1.7 : 2.0;
      const estimatedXp = Math.max(10, Math.round(metrics.wpm * (metrics.accuracy / 100) * baseDifficultyMultiplier));
      const nextXp = (currentUser.xp || 0) + estimatedXp;
      const nextLevel = Math.min(100, Math.floor(nextXp / 500) + 1);
      const nextTotalChars = (currentUser.totalCharacters || 0) + gainedChars;
      const nextHours = (currentUser.practiceHours || 0) + (durationSec / 3600);
      const nextWpm = currentUser.lifetimeWpm > 0 ? (currentUser.lifetimeWpm * 0.9 + metrics.wpm * 0.1) : metrics.wpm;
      const nextAcc = currentUser.lifetimeAccuracy > 0 ? (currentUser.lifetimeAccuracy * 0.9 + metrics.accuracy * 0.1) : metrics.accuracy;

      useAuthStore.getState().updateUserStats({
        xp: nextXp,
        level: nextLevel,
        totalCharacters: nextTotalChars,
        practiceHours: nextHours,
        lifetimeWpm: Math.round(nextWpm * 10) / 10,
        lifetimeAccuracy: Math.round(nextAcc * 10) / 10,
      });

      // Update local dashboard cache immediately
      try {
        const cacheKey = getStorageKey('typementor_dashboard_cache', currentUser.id);
        const cachedStr = localStorage.getItem(cacheKey);
        const cached = cachedStr ? JSON.parse(cachedStr) : {};
        const newSessionItem = {
          id: idempotencyKey,
          wpm: Math.round(metrics.wpm),
          rawWpm: Math.round(metrics.rawWpm || metrics.wpm),
          accuracy: Math.round(metrics.accuracy),
          consistency: Math.round(metrics.consistency || 100),
          mode,
          duration: Math.round(durationSec),
          createdAt: new Date().toISOString(),
          _count: { keystrokes: gainedChars },
        };
        const updatedHistory = [newSessionItem, ...(cached.sessionHistory || [])].slice(0, 20);
        localStorage.setItem(cacheKey, JSON.stringify({ ...cached, sessionHistory: updatedHistory, updatedAt: Date.now() }));
      } catch (err) {
        console.warn('Failed to update local dashboard cache:', err);
      }
    }

    if (isAuthenticated && token) {
      try {
        let maxWpmBefore = 0;
        let maxAccBefore = 0;
        let preTodaySessionsCount = 0;
        try {
          const cacheKey = getStorageKey('typementor_dashboard_cache', currentUser?.id);
          const cachedStr = localStorage.getItem(cacheKey);
          if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            const history = cached.sessionHistory || [];
            const sameModeRuns = history.filter((s: any) => s.mode === mode && s.id !== idempotencyKey);
            if (sameModeRuns.length > 0) {
              maxWpmBefore = Math.max(...sameModeRuns.map((s: any) => s.wpm));
              maxAccBefore = Math.max(...sameModeRuns.map((s: any) => s.accuracy));
            }
            const todayStr = new Date().toDateString();
            preTodaySessionsCount = history.filter((s: any) => new Date(s.createdAt).toDateString() === todayStr && s.id !== idempotencyKey).length;
          }
        } catch {}

        const submitRes = await fetch(getApiUrl('/api/sessions'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({
            idempotencyKey,
            mode,
            difficulty,
            wpm: metrics.wpm,
            rawWpm: metrics.rawWpm,
            accuracy: metrics.accuracy,
            consistency: metrics.consistency,
            focusScore: metrics.focusScore,
            duration: durationSec,
            backspaceCount: metrics.backspaceCount,
            correctionCount: metrics.correctionCount,
            keystrokes: metrics.keystrokes,
          }),
        });

        if (submitRes.ok) {
          const submitData = await submitRes.json();
          if (submitData.user) {
            useAuthStore.getState().updateUserStats(submitData.user);
          }
          if (submitData.xpGained > 0) showPrToast(`✨ +${submitData.xpGained} XP Earned!`);
          if (submitData.isLevelUp) showPrToast(`🎉 LEVEL UP! You reached Level ${submitData.level}! Keep pushing!`);
          if (submitData.unlockedAchievements?.length > 0) {
            submitData.unlockedAchievements.forEach((ach: any) => showPrToast(`🏅 ACHIEVEMENT UNLOCKED: ${ach.name}!`));
          }
          if (preTodaySessionsCount === 2) showPrToast(`🏆 DAILY GOAL COMPLETED! Completed 3 sessions today!`);
        }

        const beatsWpm = metrics.wpm > maxWpmBefore && maxWpmBefore > 0;
        const beatsAcc = metrics.accuracy > maxAccBefore && maxAccBefore > 0;
        if (beatsWpm || beatsAcc) {
          let prMsg = '';
          if (beatsWpm && beatsAcc) prMsg = `👑 NEW PERSONAL RECORD! Mode: ${mode} - Best WPM: ${Math.round(metrics.wpm)} & Best Accuracy: ${Math.round(metrics.accuracy)}%!`;
          else if (beatsWpm) prMsg = `👑 NEW PERSONAL RECORD! Mode: ${mode} - Best WPM: ${Math.round(metrics.wpm)}!`;
          else prMsg = `👑 NEW PERSONAL RECORD! Mode: ${mode} - Best Accuracy: ${Math.round(metrics.accuracy)}%!`;
          showPrToast(prMsg);
        }

        useAuthStore.getState().fetchProfile().catch(() => {});
      } catch (e) {
        console.error('Failed to submit session telemetry, storing locally:', e);
        const user = useAuthStore.getState().user;
        const offlineQueueKey = `typementor_offline_sessions_queue_${user?.id || 'guest'}`;
        const currentQueueStr = localStorage.getItem(offlineQueueKey);
        const currentQueue = currentQueueStr ? JSON.parse(currentQueueStr) : [];
        
        currentQueue.push({
          idempotencyKey,
          mode,
          difficulty,
          wpm: metrics.wpm,
          rawWpm: metrics.rawWpm,
          accuracy: metrics.accuracy,
          consistency: metrics.consistency,
          focusScore: metrics.focusScore,
          duration: durationSec,
          backspaceCount: metrics.backspaceCount,
          correctionCount: metrics.correctionCount,
          keystrokes: metrics.keystrokes,
          createdAt: new Date().toISOString(),
        });
        
        localStorage.setItem(offlineQueueKey, JSON.stringify(currentQueue));
        showPrToast(`💾 Practiced offline! Saved locally. Will sync when connection returns.`);
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

    lastSessionKeystrokes.current = metrics.keystrokes ?? [];
    const acc = metrics.accuracy;
    let nextDiff = difficulty;

    // Feed active duration into Daily 10-Minute Focus Tracker
    recordDailyPracticeSeconds(Math.round(durationSec));

    // ── Free Guest Preview Limit Tracking & Hard Registration Gate ──
    if (!isAuthenticated) {
      const nextCount = guestTestsCompleted + 1;
      setGuestTestsCompleted(nextCount);
      try {
        localStorage.setItem('typementor_guest_tests_count', String(nextCount));
        localStorage.setItem(
          'typementor_pending_guest_stats',
          JSON.stringify({
            wpm: Math.round(metrics.wpm),
            accuracy: Math.round(metrics.accuracy),
            timestamp: Date.now(),
          })
        );
      } catch {}
      setLastGuestMetrics({ wpm: metrics.wpm, accuracy: metrics.accuracy });

      if (nextCount === 1) {
        showPrToast('⚡ Free Guest Preview: 1 of 2 free test runs used. Sign up to save your stats & daily streak!');
      } else if (nextCount >= 2) {
        setShowGuestLoginGate(true);
      }
    }

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
  };

  const handleStartNext = () => {
    if (!isAuthenticated && guestTestsCompleted >= 2) {
      setShowGuestLoginGate(true);
      return;
    }

    const weakKeys = extractWeakKeys(lastSessionKeystrokes.current);
    if (mode === 'English') {
      if (wordCount !== 'full') {
        const prompt = getPromptForWordCount(wordCount as number, pendingNextDifficulty, weakKeys);
        initializeSession(prompt.text, 'English', prompt.tier);
      } else {
        const lesson = selectNextLesson(pendingNextDifficulty, weakKeys);
        initializeSession(lesson.text, 'English', lesson.tier);
      }
      if (weakKeys.length > 0) {
        setDifficultyAlert(`Targeting weak keys: ${weakKeys.slice(0, 3).join(', ')}`);
        setTimeout(() => setDifficultyAlert(null), 3500);
      }
    } else if (CODING_TEMPLATES[mode]) {
      const list = CODING_TEMPLATES[mode];
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      initializeSession(shuffled[0].code, mode, pendingNextDifficulty);
    } else {
      const lesson = selectNextLesson(pendingNextDifficulty, weakKeys);
      initializeSession(lesson.text, 'English', lesson.tier);
    }
  };

  const handleStartRecoveryPractice = async () => {
    if (!isAuthenticated && guestTestsCompleted >= 2) {
      setShowGuestLoginGate(true);
      return;
    }

    const token = localStorage.getItem('typementor_token');
    try {
      const response = await fetch(getApiUrl('/api/coach/recovery-lesson'), {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      const data = await response.json();
      if (response.ok) {
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
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      {difficultyAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-brand-primary border border-indigo-400 p-3 rounded-xl text-white font-bold text-xs shadow-2xl z-50 flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{difficultyAlert}</span>
        </div>
      )}

      {/* ── Standard In-Page Practice View (Upgraded Monkeytype Aesthetic) ───── */}
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Monkeytype Streamlined Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 p-2.5 rounded-2xl border border-slate-800/80 backdrop-blur-md shadow-lg">
          {/* Mode Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-extrabold px-2 tracking-wider">Mode:</span>
            {['English', 'Python', 'JavaScript', 'Java', 'SQL'].map(l => (
              <button
                key={l}
                onClick={() => handleModeChange(l)}
                type="button"
                aria-pressed={mode === l}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  mode === l
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {l}
              </button>
            ))}

            {isAuthenticated && (
              <button
                onClick={() => navigate('/interview')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-brand-danger bg-brand-danger/10 border border-brand-danger/20 hover:bg-brand-danger/20"
              >
                Pressure Interview
              </button>
            )}
          </div>

          {/* Word Count / Length Pills (Monkeytype style) */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:inline" />
            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
              {([15, 25, 50, 100, 'full'] as WordCountOption[]).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleWordCountChange(val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                    wordCount === val
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`${val === 'full' ? 'Full Lesson' : `${val} Words Sprint`}`}
                >
                  {val === 'full' ? 'Full' : val}
                </button>
              ))}
            </div>

            {/* Feature Toggles (Zen Mode, 3D Hands, AI Coach) */}
            <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:inline" />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleToggleZen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                title="Enter Distraction-Free Zen Focus Mode"
              >
                <Zap className="w-3.5 h-3.5 fill-cyan-400" />
                <span className="hidden md:inline">Zen Focus</span>
              </button>

              <button
                type="button"
                onClick={handleToggleHands}
                className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                  showHandsGuide
                    ? 'border-slate-700 bg-slate-800/80 text-white'
                    : 'border-slate-800/60 bg-slate-950/40 text-slate-500 hover:text-slate-300'
                }`}
                title={showHandsGuide ? 'Hide 3D Finger Guide' : 'Show 3D Finger Guide'}
              >
                {showHandsGuide ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleToggleAICoach}
                className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                  showAICoach
                    ? 'border-slate-700 bg-slate-800/80 text-white'
                    : 'border-slate-800/60 bg-slate-950/40 text-slate-500 hover:text-slate-300'
                }`}
                title={showAICoach ? 'Hide AI Coach Panel' : 'Show AI Coach Panel'}
              >
                <Bot className={`w-3.5 h-3.5 ${showAICoach ? 'text-indigo-400' : 'text-slate-500'}`} />
              </button>
            </div>

            {/* Daily 10-Minute Focus Goal Tracker */}
            <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:inline" />
            <div className="flex items-center gap-1.5">
              <DailyGoalTracker />

              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setShowGuestLoginGate(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono transition-all cursor-pointer"
                  title="Free guest preview runs. Click to save your profile."
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-400 hidden sm:inline">Guest:</span>
                  <span className={`font-bold ${guestTestsCompleted >= 2 ? 'text-amber-400' : 'text-cyan-400'}`}>
                    {Math.min(2, guestTestsCompleted)}/2
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Main In-Page Typing Engine ── */}
        {!isZenMode && (
          <TypingEngine
            onSessionComplete={handleSessionComplete}
            onStartNext={handleStartNext}
            onViewDashboard={() => navigate('/dashboard')}
            onStartRecoveryPractice={handleStartRecoveryPractice}
            onNavigateToAcademy={() => navigate('/academy')}
            isZenMode={false}
            onToggleZen={() => handleToggleZen(true)}
          />
        )}

        {/* Placeholder spacer while Zen Portal is active to maintain natural document height */}
        {isZenMode && (
          <div className="glass-panel p-16 rounded-3xl border border-cyan-500/20 text-center space-y-3 min-h-[350px] flex flex-col items-center justify-center">
            <div className="inline-flex p-3 rounded-full bg-cyan-500/10 text-cyan-400 animate-pulse">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Zen Focus Mode Active</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Practicing in distraction-free fullscreen mode. Press Esc or click below to return.
            </p>
            <button
              onClick={() => handleToggleZen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-all"
            >
              Exit Zen Mode
            </button>
          </div>
        )}

        {/* ── 3D Finger Positioning Tutor (Collapsible) ── */}
        {!isZenMode && showHandsGuide && !isCompleted && words && words.length > 0 && (
          <div className="pt-2 animate-in fade-in duration-300">
            <TypingFingerGuide
              targetCharacter={currentIndex < words.length ? words[currentIndex] : null}
              typedCharacter={keystrokes.length > 0 ? keystrokes[keystrokes.length - 1].actualKey : null}
              isCorrect={keystrokes.length > 0 ? !keystrokes[keystrokes.length - 1].isMistake : null}
              isActive={isActive}
            />
          </div>
        )}

        {/* ── AI Coach (Collapsible) ── */}
        {!isZenMode && showAICoach && (
          <div className="w-full animate-in fade-in duration-300">
            <React.Suspense fallback={<div className="glass-panel p-6 rounded-2xl border border-brand-border/40 text-center text-xs text-brand-muted animate-pulse">Loading AI Coach...</div>}>
              <AICoach onGenerateCustomLesson={handleCustomLessonGenerate} />
            </React.Suspense>
          </div>
        )}
      </div>

      {/* ── Zen Focus Portal (Direct to document.body, breaks out of all parent wrappers) ── */}
      {isZenMode && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#0b0f19] flex flex-col justify-between p-4 sm:p-8 md:p-12 overflow-y-auto select-none animate-in fade-in duration-200">
          {difficultyAlert && (
            <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-cyan-600 border border-cyan-400 p-3 rounded-xl text-white font-bold text-xs shadow-2xl z-50 flex items-center gap-2 animate-bounce">
              <Sparkles className="w-4 h-4" />
              <span>{difficultyAlert}</span>
            </div>
          )}

          {/* Top Minimal Zen Navigation Bar — auto-dims during active typing */}
          <div
            className={`w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 py-2 transition-opacity duration-300 ${
              isActive && !isCompleted ? 'opacity-20 hover:opacity-100' : 'opacity-100'
            }`}
          >
            {/* Brand & Focus badge */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-extrabold text-xs">
                <Zap className="w-3.5 h-3.5 fill-cyan-400" />
                <span>Zen Focus Mode</span>
              </div>

              {/* Quick Word Counts */}
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                {([15, 25, 50, 100, 'full'] as WordCountOption[]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleWordCountChange(val)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                      wordCount === val
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {val === 'full' ? 'Full' : val}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions (Fullscreen & Exit) */}
            <div className="flex items-center gap-2">
              <DailyGoalTracker />
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => handleToggleZen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 font-semibold text-xs transition-all"
                title="Exit Zen Mode (Esc)"
              >
                <X className="w-4 h-4" />
                <span>Exit Zen</span>
              </button>
            </div>
          </div>

          {/* Center: Immersive Monkeytype Typing Board */}
          <div className="w-full max-w-6xl mx-auto my-auto py-6">
            <TypingEngine
              onSessionComplete={handleSessionComplete}
              onStartNext={handleStartNext}
              onViewDashboard={() => {
                handleToggleZen(false);
                navigate('/dashboard');
              }}
              onStartRecoveryPractice={handleStartRecoveryPractice}
              onNavigateToAcademy={() => {
                handleToggleZen(false);
                navigate('/academy');
              }}
              isZenMode={true}
              onToggleZen={() => handleToggleZen(false)}
            />
          </div>

          {/* Bottom Helper Bar — auto-dims during active typing */}
          <div
            className={`w-full max-w-6xl mx-auto flex items-center justify-between text-xs text-slate-500 py-2 transition-opacity duration-300 ${
              isActive && !isCompleted ? 'opacity-0 hover:opacity-100 pointer-events-none hover:pointer-events-auto' : 'opacity-100'
            }`}
          >
            <div className="flex items-center gap-4">
              <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Tab</kbd> restart</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Esc</kbd> exit zen</span>
            </div>
            <span className="font-mono text-slate-600">Pure Distraction-Free Flow</span>
          </div>
        </div>,
        document.body
      )}

      {/* ── Forced Guest Registration Gate Modal (High-converting preview limit) ── */}
      <GuestLoginGateModal
        isOpen={showGuestLoginGate && !isAuthenticated}
        lastWpm={lastGuestMetrics.wpm}
        lastAccuracy={lastGuestMetrics.accuracy}
        completedTests={guestTestsCompleted}
        maxFreeTests={2}
        onClose={() => setShowGuestLoginGate(false)}
        onSignIn={() => navigate('/auth', { state: { from: '/practice' } })}
      />
    </>
  );
}
