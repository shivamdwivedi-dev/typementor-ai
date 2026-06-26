import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTypingStore } from '../store/TypingStore';
import { useAuthStore } from '../store/AuthStore';
import TypingEngine from '../components/TypingEngine';
import AICoach from '../components/AICoach';
import FingerCamera from '../components/FingerCamera';
import { getApiUrl } from '../utils/api';
import { CODING_TEMPLATES } from '../utils/codingTemplates';
import { selectNextLesson, extractWeakKeys } from '../utils/lessonEngine';
import { showPrToast } from '../utils/toastHelper';
import { Sparkles } from 'lucide-react';

export default function PracticeBoard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, difficulty, initializeSession, words } = useTypingStore();

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

    if (isAuthenticated && token) {
      try {
        const preSessionsRes = await fetch(getApiUrl('/api/sessions?limit=20'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        let preSessions: any[] = [];
        if (preSessionsRes.ok) {
          preSessions = await preSessionsRes.json();
        }

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
          if (submitData.xpGained > 0) showPrToast(`✨ +${submitData.xpGained} XP Earned!`);
          if (submitData.isLevelUp) showPrToast(`🎉 LEVEL UP! You reached Level ${submitData.level}! Keep pushing!`);
          if (submitData.unlockedAchievements?.length > 0) {
            submitData.unlockedAchievements.forEach((ach: any) => showPrToast(`🏅 ACHIEVEMENT UNLOCKED: ${ach.name}!`));
          }
          const todayStr = new Date().toDateString();
          const preTodaySessionsCount = preSessions.filter((s: any) => new Date(s.createdAt).toDateString() === todayStr).length;
          if (preTodaySessionsCount === 2) showPrToast(`🏆 DAILY GOAL COMPLETED! Completed 3 sessions today!`);
        }

        const beatsWpm = metrics.wpm > maxWpmBefore;
        const beatsAcc = metrics.accuracy > maxAccBefore;
        if (beatsWpm || beatsAcc) {
          let prMsg = '';
          if (beatsWpm && beatsAcc) prMsg = `👑 NEW PERSONAL RECORD! Mode: ${mode} - Best WPM: ${Math.round(metrics.wpm)} & Best Accuracy: ${Math.round(metrics.accuracy)}%!`;
          else if (beatsWpm) prMsg = `👑 NEW PERSONAL RECORD! Mode: ${mode} - Best WPM: ${Math.round(metrics.wpm)}!`;
          else prMsg = `👑 NEW PERSONAL RECORD! Mode: ${mode} - Best Accuracy: ${Math.round(metrics.accuracy)}%!`;
          showPrToast(prMsg);
        }

        useAuthStore.getState().fetchProfile();
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
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
        </div>

        <div className="lg:col-span-1 space-y-6">
          <AICoach onGenerateCustomLesson={handleCustomLessonGenerate} />
          <FingerCamera />
        </div>
      </div>
    </>
  );
}
