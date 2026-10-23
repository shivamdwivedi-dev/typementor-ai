import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTypingStore } from '../store/TypingStore';
import { useAuthStore } from '../store/AuthStore';
import TypingEngine from '../components/TypingEngine';
const AICoach = React.lazy(() => import('../components/AICoach'));
import { getApiUrl, getStorageKey } from '../utils/api';
import { CODING_TEMPLATES } from '../utils/codingTemplates';
import { selectNextLesson, extractWeakKeys } from '../utils/lessonEngine';
import { showPrToast } from '../utils/toastHelper';
import TypingFingerGuide from '../components/TypingFingerGuide';
import { Sparkles } from 'lucide-react';

export default function PracticeBoard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, difficulty, initializeSession, words, currentIndex, keystrokes, isActive, isCompleted } = useTypingStore();

  React.useEffect(() => {
    if (!words || words.length === 0) {
      const lesson = selectNextLesson(difficulty, []);
      initializeSession(lesson.text, 'English', lesson.tier);
    }
  }, [words, initializeSession, difficulty]);
  const { isAuthenticated } = useAuthStore();
  
  const [difficultyAlert, setDifficultyAlert] = useState<string | null>(null);
  const [pendingNextDifficulty, setPendingNextDifficulty] = useState(difficulty);
  const lastSessionKeystrokes = useRef<{ expectedKey: string; isMistake: boolean }[]>([]);

  // Check if we navigated here with a request to start recovery
  React.useEffect(() => {
    if (location.state?.startRecovery) {
      handleStartRecoveryPractice();
      // clear the state so we don't trigger it again on re-render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const handleModeChange = (newMode: string) => {
    if (newMode === 'English') {
      const lesson = selectNextLesson(difficulty, lastSessionKeystrokes.current.length > 0
        ? extractWeakKeys(lastSessionKeystrokes.current)
        : []);
      initializeSession(lesson.text, 'English', lesson.tier);
    } else if (CODING_TEMPLATES[newMode]) {
      const list = CODING_TEMPLATES[newMode];
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

  const handleSessionComplete = async (metrics: any) => {
    const token = localStorage.getItem('typementor_token');
    const sessionStart = useTypingStore.getState().startTime || Date.now();
    const durationSec = Math.max(0.1, (Date.now() - sessionStart) / 1000);
    const idempotencyKey = `practice-${sessionStart}-${mode}-${metrics.keystrokes?.length || 0}`;

    // ── 1. Optimistic Update (0ms latency for numbers on the site) ─────────────
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
        // Read cached history for instant personal-record comparison
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

        // Submit session immediately without blocking on a pre-fetch
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

        // Silently refresh profile in background
        useAuthStore.getState().fetchProfile().catch(() => {});
      } catch (e) {
        console.error('Failed to submit session telemetry, storing locally:', e);
        
        // Cache the session locally in offline queue
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
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      initializeSession(shuffled[0].code, mode, pendingNextDifficulty);
    } else {
      const lesson = selectNextLesson(pendingNextDifficulty, weakKeys);
      initializeSession(lesson.text, 'English', lesson.tier);
    }
  };

  const handleStartRecoveryPractice = async () => {
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

      <div className="w-full space-y-8">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2.5 bg-brand-card/30 p-2.5 rounded-xl border border-brand-border/40">
            <span className="text-[10px] text-brand-muted uppercase font-extrabold px-2">Mode:</span>
            {['English', 'Python', 'JavaScript', 'Java', 'SQL'].map(l => (
              <button
                key={l}
                onClick={() => handleModeChange(l)}
                type="button"
                aria-pressed={mode === l}
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
                onClick={() => navigate('/interview')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-brand-danger bg-brand-danger/10 border border-brand-danger/20 hover:bg-brand-danger/20"
              >
                Pressure Interview
              </button>
            )}
          </div>

          <TypingEngine
            onSessionComplete={handleSessionComplete}
            onStartNext={handleStartNext}
            onViewDashboard={() => navigate('/dashboard')}
            onStartRecoveryPractice={handleStartRecoveryPractice}
            onNavigateToAcademy={() => navigate('/academy')}
          />

          {/* 3D Finger Positioning Tutor */}
          {!isCompleted && words && words.length > 0 && (
            <div className="pt-2">
              <TypingFingerGuide
                targetCharacter={currentIndex < words.length ? words[currentIndex] : null}
                typedCharacter={keystrokes.length > 0 ? keystrokes[keystrokes.length - 1].actualKey : null}
                isCorrect={keystrokes.length > 0 ? !keystrokes[keystrokes.length - 1].isMistake : null}
                isActive={isActive}
              />
            </div>
          )}
        </div>

        <div className="w-full">
          <React.Suspense fallback={<div className="glass-panel p-6 rounded-2xl border border-brand-border/40 text-center text-xs text-brand-muted animate-pulse">Loading AI Coach...</div>}>
            <AICoach onGenerateCustomLesson={handleCustomLessonGenerate} />
          </React.Suspense>
        </div>
      </div>
    </>
  );
}
