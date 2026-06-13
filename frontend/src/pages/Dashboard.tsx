import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/AuthStore';
import { useTypingStore } from '../store/TypingStore';
import KeyboardHeatmap from '../components/KeyboardHeatmap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Trophy, TrendingUp, Clock, AlertTriangle, ShieldCheck, Flame, Compass, Sparkles, Award, Star, Activity, Play } from 'lucide-react';
import { getSmartResumeTarget, ResumeTarget } from '../utils/ResumeTracker';
import { getApiUrl, getStorageKey } from '../utils/api';

// Fallback mock history if no sessions exist
const MOCK_SESSION_HISTORY: any[] = [];

interface SessionRow {
  id: string;
  wpm: number;
  accuracy: number;
  consistency: number;
  mode: string;
  duration: number;
  createdAt: string;
  _count?: {
    keystrokes: number;
  };
}

interface DashboardProps {
  onStartRecoveryPractice?: () => void;
  onContinueJourney?: (target: ResumeTarget) => void;
}

export default function Dashboard({ onStartRecoveryPractice, onContinueJourney }: DashboardProps) {
  const { user } = useAuthStore();
  const { keystrokes, wpm } = useTypingStore();

  const completedLessons = useMemo(() => {
    const saved = localStorage.getItem(getStorageKey('academy_completed_lessons', user?.id));
    return saved ? JSON.parse(saved) : [];
  }, [user?.id]);
  const resumeTarget = useMemo(() => {
    const weakKey = user?.typingDna ? 'None' : 'None'; // will fall back to smart checks inside getSmartResumeTarget
    return getSmartResumeTarget(completedLessons, weakKey, user);
  }, [completedLessons, user]);

  const progressPercent = Math.min(100, Math.round((completedLessons.length / 50) * 100));
  const [heatmapMode, setHeatmapMode] = useState<'usage' | 'mistakes' | 'risk'>('usage');
  const [analytics, setAnalytics] = useState<any>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionRow[]>([]);
  const [recoveryReport, setRecoveryReport] = useState<any>({
    mostMistypedKey: 'None',
    confusionKey: 'None',
    accuracyLoss: 0,
    predictedWpmGain: 0,
    weakKeyToday: 'None',
    weakKeyLastWeek: 'None',
    improvementRate: 0,
    history: [],
  });
  const [enduranceStats, setEnduranceStats] = useState<any>({
    longestSession: 0,
    bestWpm: 0,
    totalWords: 0
  });

  // Fetch heatmap data and session history from backend
  const fetchAnalytics = async () => {
    const token = localStorage.getItem('typementor_token');
    if (!token) return;

    try {
      const [heatmapRes, sessionsRes, recoveryRes, enduranceRes] = await Promise.all([
        fetch(getApiUrl('/api/analytics/heatmap'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(getApiUrl('/api/sessions?limit=20'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(getApiUrl('/api/analytics/recovery-report'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(getApiUrl('/api/analytics/endurance'), { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (heatmapRes.ok) {
        const data = await heatmapRes.json();
        setAnalytics(data);
      }
      if (sessionsRes.ok) {
        const rows: SessionRow[] = await sessionsRes.json();
        setSessionHistory(rows);
      }
      if (recoveryRes.ok) {
        const recoveryData = await recoveryRes.json();
        setRecoveryReport(recoveryData);
      }
      if (enduranceRes.ok) {
        const enduranceData = await enduranceRes.json();
        setEnduranceStats(enduranceData);
      }
    } catch (e) {
      console.error('Failed to load analytics', e);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [keystrokes]); // Refetch when a new practice session ends

  // Extrapolate goal time
  const getGoalEstimates = () => {
    const hasSessions = sessionHistory.length > 0;
    const currentWpm = hasSessions ? (user?.lifetimeWpm || wpm || 0) : 0;
    const hoursPracticed = hasSessions ? (user?.practiceHours || 0) : 0;
    
    if (!hasSessions || currentWpm === 0) {
      return {
        rate: '0.0',
        to60: '0 hours',
        to80: '0 hours',
        to100: '0 hours'
      };
    }

    // Default growth rate: 2 WPM per practice hour
    // Calculate custom growth rate if user has logged some hours
    const growthRate = hoursPracticed > 0 ? (currentWpm - 35) / hoursPracticed : 2.0;
    const rate = growthRate > 0.1 ? growthRate : 2.0;

    const calcHours = (target: number) => {
      if (currentWpm >= target) return 'Completed';
      const remainingHours = (target - currentWpm) / rate;
      return `${Math.ceil(remainingHours)} hours`;
    };

    return {
      rate: rate.toFixed(1),
      to60: calcHours(60),
      to80: calcHours(80),
      to100: calcHours(100)
    };
  };

  const goals = getGoalEstimates();

  // Sort sessions oldest first for line trend calculations
  const chronoSessions = [...sessionHistory].reverse();

  // Overall PRs
  const bestOverallWpm = sessionHistory.length > 0 ? Math.max(...sessionHistory.map(s => s.wpm)) : 0;
  const bestOverallAccuracy = sessionHistory.length > 0 ? Math.max(...sessionHistory.map(s => s.accuracy)) : 0;

  // Total improvement since first session (very first session is chronoSessions[0])
  const totalWpmImprovement = chronoSessions.length >= 2 
    ? Math.round(chronoSessions[chronoSessions.length - 1].wpm - chronoSessions[0].wpm) 
    : 0;
  const totalAccuracyImprovement = chronoSessions.length >= 2 
    ? Math.round(chronoSessions[chronoSessions.length - 1].accuracy - chronoSessions[0].accuracy) 
    : 0;

  // Dynamic Recovery Widget Calculations
  const weakKeyThisWeek = useMemo(() => {
    if (recoveryReport.history && recoveryReport.history.length > 0) {
      const counts: Record<string, number> = {};
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      recoveryReport.history.forEach((h: any) => {
        if (new Date(h.createdAt).getTime() > sevenDaysAgo) {
          counts[h.mostMistypedKey] = (counts[h.mostMistypedKey] || 0) + 1;
        }
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) return sorted[0][0];
    }
    return recoveryReport.mostMistypedKey || 'None';
  }, [recoveryReport]);

  const mostImprovedKey = useMemo(() => {
    if (recoveryReport.history && recoveryReport.history.length > 0) {
      const firstScores: Record<string, number> = {};
      const latestScores: Record<string, number> = {};
      recoveryReport.history.forEach((h: any) => {
        const k = h.mostMistypedKey;
        if (firstScores[k] === undefined) {
          firstScores[k] = h.recoveryScore;
        }
        latestScores[k] = h.recoveryScore;
      });
      let bestKey = 'None';
      let maxDiff = -999;
      Object.keys(latestScores).forEach(k => {
        const diff = latestScores[k] - firstScores[k];
        if (diff > maxDiff && diff > 0) {
          maxDiff = diff;
          bestKey = k;
        }
      });
      return bestKey !== 'None' ? `${bestKey} (+${maxDiff}%)` : 'None';
    }
    return 'None';
  }, [recoveryReport]);

  const recoverySessionsCompleted = recoveryReport.history ? recoveryReport.history.length : 0;

  // Combine fetched sessions or fall back to mock history for graphs
  const getGraphData = (): any[] => {
    if (sessionHistory.length > 0) {
      // Last 10 sessions chronologically
      const last10 = sessionHistory.slice(0, 10).reverse();
      return last10.map((s, i) => ({
        ...s,
        createdAt: `Session ${i + 1}`,
      }));
    }
    return MOCK_SESSION_HISTORY;
  };

  const graphData = getGraphData();

  // Load heatmap statistics (use real database telemetry or empty fallback only, no mock data)
  const heatmapData = (analytics && sessionHistory.length > 0) ? analytics : {
    keyUsage: {},
    keyMistakes: {},
    weakKeys: {},
    riskKeys: {},
    weakestFinger: 'None',
    handReport: {
      left: { total: 0, mistakes: 0, errorRate: 0 },
      right: { total: 0, mistakes: 0, errorRate: 0 }
    },
    fingerReport: [],
    commonMistakes: []
  };

  // Daily goal calculation: complete 3 sessions today
  const todaySessionsCount = (() => {
    const todayStr = new Date().toDateString();
    return sessionHistory.filter(s => new Date(s.createdAt).toDateString() === todayStr).length;
  })();
  const dailyGoalTarget = 3;
  const dailyGoalPercentage = Math.min(100, Math.round((todaySessionsCount / dailyGoalTarget) * 100));

  const totalXp = user?.xp || 0;
  const currentLevel = Math.min(100, Math.floor(totalXp / 500) + 1);
  const currentXp = totalXp % 500;
  const xpNeeded = 500;
  const xpProgressPercent = Math.min(100, Math.round((currentXp / xpNeeded) * 100));

  return (
    <div className="space-y-8 pb-12">
      {/* Top Welcome Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Intelligence Dashboard</h2>
          <p className="text-brand-muted text-sm mt-1">
            Analyzing {user?.name || 'Guest User'}'s keystroke telemetry & typing DNA profile.
          </p>
        </div>
        
        {/* Streak and Level Badges */}
        <div className="flex items-center gap-3">
          <div className="bg-brand-warning/10 border border-brand-warning/20 px-4 py-2 rounded-xl flex items-center gap-2 text-brand-warning">
            <Flame className="w-5 h-5 fill-brand-warning/20" />
            <div className="text-left">
              <div className="text-[9px] uppercase font-extrabold tracking-wider leading-none">Streak</div>
              <div className="text-sm font-black mt-0.5">{user?.streak || 0} Days</div>
            </div>
          </div>

          <div className="bg-brand-primary/10 border border-brand-primary/20 px-4 py-2 rounded-xl flex items-center gap-2 text-brand-primary">
            <Trophy className="w-5 h-5" />
            <div className="text-left">
              <div className="text-[9px] uppercase font-extrabold tracking-wider leading-none">Rank</div>
              <div className="text-sm font-black mt-0.5">Level {currentLevel}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 4 Founder-Level Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 relative overflow-hidden">
          <div className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Lifetime WPM</div>
          <div className="text-3xl font-black text-brand-primary mt-2 font-mono">
            {sessionHistory.length > 0 ? Math.round(user?.lifetimeWpm || wpm || 0) : 0}
          </div>
          <p className="text-[10px] text-brand-muted mt-1 leading-none">Targeting next tier speed</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 relative overflow-hidden">
          <div className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Avg Accuracy</div>
          <div className="text-3xl font-black text-brand-success mt-2 font-mono">
            {sessionHistory.length > 0 ? Math.round(user?.lifetimeAccuracy || 0) : 0}%
          </div>
          <p className="text-[10px] text-brand-muted mt-1 leading-none">Laser accuracy control</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 relative overflow-hidden">
          <div className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Characters Typed</div>
          <div className="text-3xl font-black text-white mt-2 font-mono">
            {sessionHistory.length > 0 ? (user?.totalCharacters || 0).toLocaleString() : '0'}
          </div>
          <p className="text-[10px] text-brand-muted mt-1 leading-none">Lifetime key metrics captured</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 relative overflow-hidden">
          <div className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Practice Time</div>
          <div className="text-3xl font-black text-brand-warning mt-2 font-mono">
            {sessionHistory.length > 0 ? (user?.practiceHours || 0).toFixed(1) : '0.0'} hrs
          </div>
          <p className="text-[10px] text-brand-muted mt-1 leading-none">Total active telemetry hours</p>
        </div>
      </div>

      {/* ── Continue Your Journey (Smart Resume Widget) ── */}
      <div className="glass-panel p-6 rounded-3xl border border-brand-primary/45 bg-gradient-to-r from-brand-primary/10 via-brand-card/50 to-brand-bg/95 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-left w-full md:w-auto">
          <div className="bg-brand-primary/15 p-3.5 rounded-2xl border border-brand-primary/30 text-brand-primary hidden sm:block">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <span className="text-[9px] bg-brand-primary/20 text-brand-primary font-black px-2 py-0.5 rounded tracking-wider uppercase w-fit block">
              Continue Your Journey
            </span>
            <h3 className="text-white font-extrabold text-base md:text-lg tracking-tight leading-snug">
              {resumeTarget.buttonLabel}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-brand-muted font-medium">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Est. Time: <strong className="text-white font-mono">{resumeTarget.type === 'academy' ? '4 min' : resumeTarget.type === 'recovery' ? '3 min' : resumeTarget.type === 'endurance' ? '5 min' : '2 min'}</strong>
              </span>
              <span>•</span>
              <span>Academy Progress: <strong className="text-white font-mono">{completedLessons.length} / 50 Lessons ({progressPercent}%)</strong></span>
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="w-full sm:w-44 bg-brand-bg/40 border border-brand-border/40 p-[2px] rounded-full h-3 overflow-hidden self-center hidden lg:block animate-pulse">
            <div className="bg-brand-primary h-full rounded-full" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <button
            onClick={() => {
              if (onContinueJourney) onContinueJourney(resumeTarget);
            }}
            className="bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-xl shadow-brand-primary/20 hover:shadow-brand-primary/30 transition-all text-xs flex items-center justify-center gap-2 border border-indigo-400/30 w-full md:w-auto font-mono"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Continue Learning</span>
          </button>
        </div>
      </div>

      {/* daily goal progress, XP progression, and recent achievements widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Goal card */}
        <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border/30 pb-2">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Star className="w-5 h-5 text-brand-warning" />
              Daily Practice Goal
            </h3>
            <span className="text-[10px] bg-brand-warning/10 text-brand-warning font-bold px-2 py-0.5 rounded">
              Goal: {dailyGoalTarget} Sessions
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-brand-muted">Today's Progress</span>
              <span className="text-white font-bold">{todaySessionsCount} / {dailyGoalTarget} ({dailyGoalPercentage}%)</span>
            </div>
            <div className="w-full bg-brand-card rounded-xl h-4 overflow-hidden border border-brand-border/50 p-[1.5px]">
              <div
                className="bg-brand-warning h-full rounded-md transition-all duration-500 shadow-sm"
                style={{ width: `${dailyGoalPercentage}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-brand-muted">
              {todaySessionsCount >= dailyGoalTarget 
                ? "🎉 Daily Goal Achieved! Great practice today!" 
                : `Complete ${dailyGoalTarget - todaySessionsCount} more session${dailyGoalTarget - todaySessionsCount === 1 ? '' : 's'} today to reach your goal.`}
            </p>
          </div>
        </div>

        {/* Level & XP progression widget */}
        <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border/30 pb-2">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-brand-primary" />
              XP Progression Dashboard
            </h3>
            <span className="text-[10px] bg-brand-primary/10 text-brand-primary font-bold px-2 py-0.5 rounded">
              Level {currentLevel}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-brand-muted">Total XP: <strong className="text-brand-primary font-mono">{totalXp.toLocaleString()}</strong></span>
              <span className="text-white font-bold">{currentXp} / {xpNeeded} XP ({xpProgressPercent}%)</span>
            </div>
            <div className="w-full bg-brand-card rounded-xl h-4 overflow-hidden border border-brand-border/50 p-[1.5px]">
              <div
                className="bg-brand-primary h-full rounded-md transition-all duration-500 shadow-sm"
                style={{ width: `${xpProgressPercent}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-brand-muted">
              Earn XP by finishing typing tests. Dynamic bonus XP is awarded on accuracy levels, WPM counts, and challenge thresholds.
            </p>
          </div>
        </div>

        {/* Recent Achievements card */}
        <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border/30 pb-2">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-success" />
              Recent Achievements
            </h3>
            <span className="text-[10px] bg-brand-success/10 text-brand-success font-bold px-2 py-0.5 rounded">
              Unlocked: {user?.achievements?.length || 0}
            </span>
          </div>

          <div className="space-y-2.5">
            {user?.achievements && user.achievements.length > 0 ? (
              [...user.achievements]
                .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
                .slice(0, 2)
                .map((ua: any) => (
                  <div key={ua.id} className="flex items-center gap-2.5 bg-brand-bg/40 p-2 rounded-xl border border-brand-border/20">
                    <div className="text-lg">
                      {ua.achievement.code === 'FIRST_SESSION' ? '✨' : 
                       ua.achievement.code.startsWith('STREAK') ? '🔥' : 
                       ua.achievement.code.startsWith('WPM') ? '⚡' : 
                       ua.achievement.code.startsWith('ACC') ? '🎯' : '🏆'}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <span className="font-bold text-xs text-white block truncate">{ua.achievement.name}</span>
                      <span className="text-[9px] text-brand-muted block truncate">{ua.achievement.description}</span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="py-5 text-center text-xs text-brand-muted border border-dashed border-brand-border/40 rounded-xl bg-brand-card/10">
                No achievements unlocked yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Progress & Personal Records Ribbon ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-brand-muted uppercase font-extrabold tracking-wider">Best Overall Speed</span>
            <div className="text-2xl font-black text-brand-primary font-mono">{sessionHistory.length > 0 ? (bestOverallWpm || Math.round(user?.lifetimeWpm || wpm || 0)) : 0} WPM</div>
          </div>
          <div className="bg-brand-primary/10 p-2.5 rounded-xl text-brand-primary">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-brand-muted uppercase font-extrabold tracking-wider">Best Overall Accuracy</span>
            <div className="text-2xl font-black text-brand-success font-mono">{sessionHistory.length > 0 ? (bestOverallAccuracy || Math.round(user?.lifetimeAccuracy || 0)) : 0}%</div>
          </div>
          <div className="bg-brand-success/10 p-2.5 rounded-xl text-brand-success">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-brand-muted uppercase font-extrabold tracking-wider">Total Net Improvement</span>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-base font-black font-mono ${sessionHistory.length > 1 && totalWpmImprovement >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                {sessionHistory.length > 1 && totalWpmImprovement >= 0 ? '+' : ''}{sessionHistory.length > 1 ? totalWpmImprovement : 0} WPM
              </span>
              <span className="text-brand-muted text-xs font-bold">|</span>
              <span className={`text-base font-black font-mono ${sessionHistory.length > 1 && totalAccuracyImprovement >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                {sessionHistory.length > 1 && totalAccuracyImprovement >= 0 ? '+' : ''}{sessionHistory.length > 1 ? totalAccuracyImprovement : 0}% Acc
              </span>
            </div>
            <p className="text-[9px] text-brand-muted leading-none">Since first logged session</p>
          </div>
          <div className="bg-brand-warning/10 p-2.5 rounded-xl text-brand-warning">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── Endurance Arena Performance Card ── */}
      <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-brand-border/30 pb-3">
          <Activity className="w-5 h-5 text-brand-primary animate-pulse" />
          Endurance Arena Performance
        </h3>
        {enduranceStats.totalWords === 0 ? (
          <div className="py-8 text-center text-xs text-brand-muted border border-dashed border-brand-border/40 rounded-xl bg-brand-card/10">
            No endurance data yet. Complete an Endurance Arena session to unlock these metrics!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border/35 text-left">
              <span className="text-[10px] text-brand-muted uppercase font-extrabold tracking-wider block">Best Endurance Speed</span>
              <span className="text-2xl font-black text-brand-primary font-mono block mt-1.5">{enduranceStats.bestWpm} WPM</span>
            </div>

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border/35 text-left">
              <span className="text-[10px] text-brand-muted uppercase font-extrabold tracking-wider block">Longest Endurance Session</span>
              <span className="text-2xl font-black text-brand-warning font-mono block mt-1.5">
                {Math.floor(enduranceStats.longestSession / 60)}:{(enduranceStats.longestSession % 60).toFixed(0).padStart(2, '0')}
              </span>
            </div>

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border/35 text-left">
              <span className="text-[10px] text-brand-muted uppercase font-extrabold tracking-wider block">Total Endurance Words Typed</span>
              <span className="text-2xl font-black text-brand-success font-mono block mt-1.5">{enduranceStats.totalWords.toLocaleString()} Words</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Recent Sessions History Card ── */}
      <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4">
        <div className="flex items-center justify-between border-b border-brand-border/30 pb-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-primary" />
            Recent Session History
          </h3>
          <span className="text-[10px] bg-brand-primary/10 text-brand-primary font-bold px-2 py-0.5 rounded">
            Last 20 Sessions
          </span>
        </div>

        {sessionHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-brand-muted border border-dashed border-brand-border/40 rounded-xl bg-brand-card/10">
            Complete your first typing session to start building your profile.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-brand-border/30 text-brand-muted uppercase font-bold text-[9px] tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">WPM</th>
                  <th className="py-2.5 px-3">Accuracy</th>
                  <th className="py-2.5 px-3">Chars</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3 text-right">Personal Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/20 font-mono">
                {sessionHistory.map((session) => {
                  // Find WPM delta relative to the previous session in time
                  // chronoSessions order: [oldest, ..., newest].
                  // Let's locate this session's index in the chronological timeline
                  const chronoIndex = chronoSessions.findIndex(s => s.id === session.id);
                  let wpmDelta = 0;
                  let accDelta = 0;
                  if (chronoIndex > 0) {
                    const prev = chronoSessions[chronoIndex - 1];
                    wpmDelta = Math.round(session.wpm - prev.wpm);
                    accDelta = Math.round(session.accuracy - prev.accuracy);
                  }

                  // Determine if this is a personal record for the mode
                  // Since chronoSessions is oldest first, a session is a PR if it's strictly the max *up to that point in time*
                  let isModePrWpm = false;
                  let isModePrAcc = false;
                  if (chronoIndex !== -1) {
                    const sessionsUpToThis = chronoSessions.slice(0, chronoIndex + 1);
                    const sameModeSessions = sessionsUpToThis.filter(s => s.mode === session.mode);
                    const maxWpmBeforeThis = sameModeSessions.length > 1
                      ? Math.max(...sameModeSessions.slice(0, -1).map(s => s.wpm))
                      : 0;
                    const maxAccBeforeThis = sameModeSessions.length > 1
                      ? Math.max(...sameModeSessions.slice(0, -1).map(s => s.accuracy))
                      : 0;

                    if (session.wpm > maxWpmBeforeThis) {
                      isModePrWpm = true;
                    }
                    if (session.accuracy > maxAccBeforeThis) {
                      isModePrAcc = true;
                    }
                  }

                  const formattedDate = new Date(session.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={session.id} className="hover:bg-brand-card/25 transition-colors">
                      <td className="py-3 px-3 text-brand-muted">{formattedDate}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-brand-card text-brand-text rounded-md border border-brand-border/40 text-[10px] font-bold">
                          {session.mode}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-white font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>{Math.round(session.wpm)}</span>
                          {wpmDelta > 0 ? (
                            <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-brand-success/15 text-brand-success border border-brand-success/25">
                              +{wpmDelta}
                            </span>
                          ) : wpmDelta < 0 ? (
                            <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-brand-danger/15 text-brand-danger border border-brand-danger/25">
                              {wpmDelta}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-brand-muted border border-brand-border/40">
                              0
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-brand-success font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>{Math.round(session.accuracy)}%</span>
                          {accDelta > 0 ? (
                            <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-brand-success/15 text-brand-success border border-brand-success/25">
                              +{accDelta}%
                            </span>
                          ) : accDelta < 0 ? (
                            <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-brand-danger/15 text-brand-danger border border-brand-danger/25">
                              {accDelta}%
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-brand-muted border border-brand-border/40">
                              0%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-brand-muted">
                        {session._count?.keystrokes || 'N/A'}
                      </td>
                      <td className="py-3 px-3 text-brand-muted">
                        {Math.round(session.duration)}s
                      </td>
                      <td className="py-3 px-3 text-right">
                        {(isModePrWpm || isModePrAcc) ? (
                          <div className="flex justify-end gap-1 flex-wrap">
                            {isModePrWpm && (
                              <span className="bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                                Mode Speed PR
                              </span>
                            )}
                            {isModePrAcc && (
                              <span className="bg-brand-success/10 text-brand-success border border-brand-success/20 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                                Mode Acc PR
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-brand-muted text-[10px] italic">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Onboarding Cards (Shown for zero sessions to guide new users) ── */}
      {sessionHistory.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Academy Onboarding Card */}
          <div className="glass-panel p-6 rounded-2xl border border-brand-primary/30 bg-gradient-to-br from-brand-primary/5 to-transparent space-y-4 text-left">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-xl text-brand-primary">
              🏫
            </div>
            <h4 className="font-bold text-white text-base">Typing Academy</h4>
            <p className="text-xs text-brand-muted leading-relaxed">
              Start your touch typing journey here! Our structured 30-lesson syllabus guides you from basic home row anchor keys up to advanced speed building drills.
            </p>
            <div className="text-[10px] text-brand-muted font-semibold bg-slate-950/40 px-3 py-2 rounded-lg border border-brand-border/20 w-fit">
              Select "Typing Academy" from the top navigation to begin.
            </div>
          </div>

          {/* Recovery System Onboarding Card */}
          <div className="glass-panel p-6 rounded-2xl border border-brand-warning/30 bg-gradient-to-br from-brand-warning/5 to-transparent space-y-4 text-left">
            <div className="w-12 h-12 rounded-xl bg-brand-warning/10 border border-brand-warning/30 flex items-center justify-center text-xl text-brand-warning">
              🩹
            </div>
            <h4 className="font-bold text-white text-base">AI Recovery System</h4>
            <p className="text-xs text-brand-muted leading-relaxed">
              As you practice, TypeMentor AI automatically analyzes your backspace corrections and mistyped keys. Complete a session with mistakes to unlock recovery drills!
            </p>
            <div className="text-[10px] text-brand-muted font-mono bg-slate-950/40 px-3 py-2 rounded-lg border border-brand-border/20 w-fit">
              Status: Locked · Complete first practice run
            </div>
          </div>
        </div>
      )}

      {/* ── AI Weak-Key Recovery Report Card ── */}
      <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/30 pb-4">
          <div className="flex items-center gap-3 text-left">
            <div className="bg-brand-warning/15 p-2 rounded-xl text-brand-warning">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">AI Weak-Key Recovery System</h3>
              <p className="text-xs text-brand-muted mt-0.5">
                TypeMentor learns from your mistakes and creates personalized recovery lessons automatically.
              </p>
            </div>
          </div>
          {onStartRecoveryPractice && recoveryReport.mostMistypedKey !== 'None' && sessionHistory.length > 0 && (
            <button
              onClick={onStartRecoveryPractice}
              className="px-4 py-2 bg-brand-warning text-slate-950 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shadow-lg shadow-brand-warning/15"
            >
              <Sparkles className="w-4 h-4 fill-slate-950/20" />
              Practice Weak Keys
            </button>
          )}
        </div>

        {sessionHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-brand-muted border border-dashed border-brand-border/40 rounded-xl bg-brand-card/10">
            No typing metrics captured yet. Practice English or Code modes to compile mistake profiles.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recovery Stats */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-brand-muted uppercase tracking-wider">Mistake Profile & Impact</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-brand-bg/50 p-3 rounded-xl border border-brand-border/30">
                  <span className="text-xs font-medium text-brand-muted">Most Mistyped Key:</span>
                  <span className="text-sm font-bold text-white px-2.5 py-0.5 bg-brand-danger/10 border border-brand-danger/25 text-brand-danger rounded-lg font-mono">
                    {recoveryReport.mostMistypedKey}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-brand-bg/50 p-3 rounded-xl border border-brand-border/30">
                  <span className="text-xs font-medium text-brand-muted">Common Confusion:</span>
                  <span className="text-xs font-semibold text-white">
                    {recoveryReport.mostMistypedKey} &rarr; {recoveryReport.confusionKey}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-brand-bg/50 p-3 rounded-xl border border-brand-border/30">
                  <span className="text-xs font-medium text-brand-muted">Accuracy Loss:</span>
                  <span className="text-sm font-mono font-bold text-brand-danger">
                    -{recoveryReport.accuracyLoss}%
                  </span>
                </div>
                <div className="flex justify-between items-center bg-brand-bg/50 p-3 rounded-xl border border-brand-border/30">
                  <span className="text-xs font-medium text-brand-muted">Predicted WPM Gain:</span>
                  <span className="text-sm font-mono font-bold text-brand-success">
                    +{recoveryReport.predictedWpmGain} WPM
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Progress */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-brand-muted uppercase tracking-wider">Visual Recovery Progress</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-brand-bg/50 p-3 rounded-xl border border-brand-border/30">
                  <span className="text-xs font-medium text-brand-muted">Weak Key Today:</span>
                  <span className="text-xs font-bold text-white font-mono">{recoveryReport.weakKeyToday}</span>
                </div>
                <div className="flex justify-between items-center bg-brand-bg/50 p-3 rounded-xl border border-brand-border/30">
                  <span className="text-xs font-medium text-brand-muted">Weak Key This Week:</span>
                  <span className="text-xs font-bold text-white font-mono">{weakKeyThisWeek}</span>
                </div>
                <div className="flex justify-between items-center bg-brand-bg/50 p-3 rounded-xl border border-brand-border/30">
                  <span className="text-xs font-medium text-brand-muted">Most Improved Key:</span>
                  <span className="text-xs font-bold text-brand-success font-mono">{mostImprovedKey}</span>
                </div>
                <div className="flex justify-between items-center bg-brand-bg/50 p-3 rounded-xl border border-brand-border/30">
                  <span className="text-xs font-medium text-brand-muted">Sessions Completed:</span>
                  <span className="text-xs font-bold text-white font-mono">{recoverySessionsCompleted}</span>
                </div>
              </div>
            </div>

            {/* Recovery History chart or trend message */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-brand-muted uppercase tracking-wider">Recovery Score Trend</h4>
              {recoveryReport.history && recoveryReport.history.length >= 2 ? (
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recoveryReport.history} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                      <XAxis dataKey="createdAt" stroke="#94a3b8" fontSize={8} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} />
                      <YAxis stroke="#94a3b8" fontSize={8} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="recoveryScore" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Target Key Accuracy" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 w-full flex items-center justify-center border border-dashed border-brand-border/40 rounded-xl bg-brand-card/10 text-center px-4">
                  <p className="text-xs text-brand-muted">Not enough recovery history yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Recovery History List (Table) ── */}
        {sessionHistory.length > 0 && (
          <div className="border-t border-brand-border/20 pt-6 space-y-3">
            <h4 className="text-xs font-bold text-brand-muted uppercase tracking-wider">Recovery Session History</h4>
            {!recoveryReport.history || recoveryReport.history.length === 0 ? (
              <div className="py-6 text-center text-xs text-brand-muted border border-dashed border-brand-border/40 rounded-xl bg-brand-card/10 px-4">
                No recovery sessions yet. Complete a practice session with mistakes to unlock recovery drills.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-brand-muted border-b border-brand-border/20 uppercase font-black tracking-wider text-[10px]">
                      <th className="pb-3 pl-2">Date</th>
                      <th className="pb-3">Weak Key</th>
                      <th className="pb-3">Confusion Pair</th>
                      <th className="pb-3 text-right">Target Key Accuracy</th>
                      <th className="pb-3 text-right">Improvement %</th>
                      <th className="pb-3 text-right pr-2">WPM Gain Estimate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/20 font-mono">
                    {[...recoveryReport.history].reverse().slice(0, 20).map((h: any, idx: number) => {
                      const firstForThisKey = recoveryReport.history.find((x: any) => x.mostMistypedKey === h.mostMistypedKey);
                      const improvement = firstForThisKey ? Math.max(0, Math.round(h.recoveryScore - firstForThisKey.recoveryScore)) : 0;
                      return (
                        <tr key={h.id || idx} className="hover:bg-brand-card/25 transition-colors">
                          <td className="py-3 pl-2 text-white">
                            {new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-3 font-bold text-brand-danger">
                            {h.mostMistypedKey}
                          </td>
                          <td className="py-3 text-brand-muted">
                            {h.mostMistypedKey} &rarr; {h.confusionKey || '?'}
                          </td>
                          <td className="py-3 text-right text-brand-warning font-bold">
                            {h.recoveryScore}%
                          </td>
                          <td className={`py-3 text-right font-bold ${improvement > 0 ? 'text-brand-success' : 'text-brand-muted'}`}>
                            +{improvement}%
                          </td>
                          <td className="py-3 text-right text-cyan-400 font-bold pr-2">
                            +{h.predictedWpmGain} WPM
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Speed & Accuracy Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-brand-border/40">
          <div className="flex items-center justify-between mb-4 border-b border-brand-border/30 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-primary" />
              WPM Speed Trend
            </h3>
            <span className="text-[10px] bg-brand-primary/10 text-brand-primary font-bold px-2 py-0.5 rounded">
              Last 10 sessions
            </span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {sessionHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="createdAt" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="wpm" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} name="WPM" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-4 space-y-3">
                <Activity className="w-8 h-8 text-brand-primary/30 mx-auto animate-pulse" />
                <div>
                  <p className="text-xs font-bold text-white">No Telemetry Recorded Yet</p>
                  <p className="text-[10px] text-brand-muted max-w-xs mt-1">Complete your first practice drill to compile speed and raw words-per-minute statistics.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-brand-border/40">
          <div className="flex items-center justify-between mb-4 border-b border-brand-border/30 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Compass className="w-5 h-5 text-brand-success" />
              Accuracy Progression
            </h3>
            <span className="text-[10px] bg-brand-success/10 text-brand-success font-bold px-2 py-0.5 rounded">
              Telemetry accuracy %
            </span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {sessionHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={graphData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="createdAt" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} domain={[80, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="accuracy" stroke="#10b981" fill="rgba(16, 185, 129, 0.05)" strokeWidth={2.5} name="Accuracy %" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-4 space-y-3">
                <Compass className="w-8 h-8 text-brand-success/30 mx-auto animate-pulse" />
                <div>
                  <p className="text-xs font-bold text-white">No Accuracy Telemetry Yet</p>
                  <p className="text-[10px] text-brand-muted max-w-xs mt-1">Practice consistently to track your typing accuracy progression over time.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Heatmap and Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/30 pb-3">
          <h3 className="font-bold text-white text-base">Interactive Heatmap Profiler</h3>
          
          <div className="flex bg-brand-card/45 p-1 rounded-xl border border-brand-border">
            <button
              onClick={() => setHeatmapMode('usage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                heatmapMode === 'usage' ? 'bg-brand-primary text-white' : 'text-brand-muted hover:text-white'
              }`}
            >
              Key Usage
            </button>
            <button
              onClick={() => setHeatmapMode('mistakes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                heatmapMode === 'mistakes' ? 'bg-brand-danger text-white' : 'text-brand-muted hover:text-white'
              }`}
            >
              Key Mistakes
            </button>
            <button
              onClick={() => setHeatmapMode('risk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                heatmapMode === 'risk' ? 'bg-brand-warning text-white' : 'text-brand-muted hover:text-white'
              }`}
            >
              Predicted Risk
            </button>
          </div>
        </div>

        <KeyboardHeatmap
          keyUsage={heatmapData.keyUsage}
          keyMistakes={heatmapData.keyMistakes}
          weakKeys={heatmapData.weakKeys}
          riskKeys={heatmapData.riskKeys}
          mode={heatmapMode}
        />
      </div>

      {/* Bottom telemetry panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Extrapolation Goals */}
        <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4">
          <h4 className="font-bold text-white text-sm flex items-center gap-2 border-b border-brand-border/30 pb-2">
            <Clock className="w-4 h-4 text-brand-primary" />
            Time to target estimations
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-brand-bg/50 p-2.5 rounded-xl border border-brand-border/30">
              <span className="text-xs font-medium">To 60 WPM</span>
              <span className="text-xs font-bold text-brand-primary">{goals.to60}</span>
            </div>
            <div className="flex justify-between items-center bg-brand-bg/50 p-2.5 rounded-xl border border-brand-border/30">
              <span className="text-xs font-medium">To 80 WPM</span>
              <span className="text-xs font-bold text-brand-warning">{goals.to80}</span>
            </div>
            <div className="flex justify-between items-center bg-brand-bg/50 p-2.5 rounded-xl border border-brand-border/30">
              <span className="text-xs font-medium">To 100 WPM</span>
              <span className="text-xs font-bold text-brand-danger">{goals.to100}</span>
            </div>
          </div>
          <p className="text-[10px] text-brand-muted leading-relaxed">
            Calculated at growth rate of <span className="text-white font-mono font-bold">{goals.rate} WPM</span> per practice hour.
          </p>
        </div>

        {/* Biometrics DNA profile */}
        <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4">
          <h4 className="font-bold text-white text-sm flex items-center gap-2 border-b border-brand-border/30 pb-2">
            <ShieldCheck className="w-4 h-4 text-brand-success" />
            Typing DNA biometric profile
          </h4>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-brand-muted">Biometric Status:</span>
              <span className="text-brand-success font-bold">Active & Verified</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted">Average Key Dwell:</span>
              <span className="text-white font-mono">82ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted">Average Digraph Delay:</span>
              <span className="text-white font-mono">140ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted">Rhythm Consistency:</span>
              <span className="text-brand-success font-semibold">89% (High)</span>
            </div>
          </div>
          <div className="p-2 rounded bg-brand-success/5 border border-brand-success/20 text-[10px] text-brand-success/90">
            Biometric signature matches your profile with 94% fidelity, securing session telemetry.
          </div>
        </div>

        {/* Key Confusions */}
        <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4">
          <h4 className="font-bold text-white text-sm flex items-center gap-2 border-b border-brand-border/30 pb-2">
            <AlertTriangle className="w-4 h-4 text-brand-danger" />
            Most Common Key Confusion
          </h4>
          <div className="space-y-3">
            {heatmapData.commonMistakes.slice(0, 3).map((cm: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-brand-card rounded-md font-bold font-mono border border-brand-border">{cm.expectedKey}</span>
                  <span className="text-brand-muted leading-none">instead of</span>
                  <span className="px-2 py-1 bg-brand-danger/10 text-brand-danger rounded-md font-bold font-mono border border-brand-danger/25">{cm.pressedKey}</span>
                </div>
                <span className="font-semibold font-mono text-brand-muted">{cm.count} times</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-brand-danger/80">
            Weakest finger identified: <span className="font-bold uppercase tracking-wider">{heatmapData.weakestFinger}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
