import { useMemo } from 'react';
import {
  CheckCircle2, RotateCcw, ArrowRight, LayoutDashboard,
  Zap, Target, TrendingUp, AlertTriangle, Flame,
  Clock, Activity, ChevronRight, Sparkles, ShieldCheck
} from 'lucide-react';
import { KeystrokeInfo } from '../store/TypingStore';

interface SessionResultsProps {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  focusScore: number;
  backspaceCount: number;
  correctionCount: number;
  keystrokes: KeystrokeInfo[];
  mode: string;
  difficulty: number;
  onNext: () => void;
  onRetry: () => void;
  onDashboard: () => void;
  onStartRecoveryPractice?: () => void;
  onNavigateToAcademy?: () => void;
}

// Derive mistake pairs and weak keys from the raw keystroke log
function analyzeKeystrokes(keystrokes: KeystrokeInfo[]) {
  const mistakePairs: Record<string, number> = {};
  const keyErrors: Record<string, number> = {};
  const keyTotal: Record<string, number> = {};

  for (const ks of keystrokes) {
    const exp = ks.expectedKey.toUpperCase();
    const act = ks.actualKey.toUpperCase();

    if (!exp || exp === ' ') continue;

    keyTotal[exp] = (keyTotal[exp] ?? 0) + 1;

    if (ks.isMistake) {
      const pair = `${exp}→${act}`; // expected -> pressed
      mistakePairs[pair] = (mistakePairs[pair] ?? 0) + 1;
      keyErrors[exp] = (keyErrors[exp] ?? 0) + 1;
    }
  }

  const topMistakePairs = Object.entries(mistakePairs)
    .sort((a, b) => b[1] - a[1])
    .map(([pair, count]) => {
      const [expected, pressed] = pair.split('→');
      return { expected, pressed, count };
    });

  const weakKeys = Object.entries(keyErrors)
    .sort((a, b) => b[1] - a[1])
    .map(([key, errors]) => ({
      key,
      errors,
      errorRate: Math.round(((keyErrors[key] ?? 0) / (keyTotal[key] ?? 1)) * 100),
    }));

  const totalMistakes = keystrokes.filter(k => k.isMistake).length;
  const avgReactionMs = keystrokes.length > 0
    ? Math.round(keystrokes.reduce((s, k) => s + k.reactionTime, 0) / keystrokes.length)
    : 0;

  return { topMistakePairs, weakKeys, totalMistakes, avgReactionMs };
}

// Score-based performance label
function getPerformanceLabel(wpm: number, accuracy: number): { label: string; color: string; emoji: string } {
  if (accuracy >= 98 && wpm >= 80) return { label: 'Elite', color: 'text-brand-primary', emoji: '👑' };
  if (accuracy >= 95 && wpm >= 60) return { label: 'Advanced', color: 'text-brand-success', emoji: '🚀' };
  if (accuracy >= 90 && wpm >= 45) return { label: 'Intermediate', color: 'text-brand-warning', emoji: '⚡' };
  if (accuracy >= 85) return { label: 'Developing', color: 'text-amber-400', emoji: '📈' };
  return { label: 'Beginner', color: 'text-brand-muted', emoji: '🌱' };
}

export default function SessionResults({
  wpm, rawWpm, accuracy, consistency, focusScore,
  backspaceCount, keystrokes, mode, difficulty,
  onNext, onRetry, onDashboard, onStartRecoveryPractice, onNavigateToAcademy
}: SessionResultsProps) {
  const { topMistakePairs, weakKeys, totalMistakes, avgReactionMs } = useMemo(
    () => analyzeKeystrokes(keystrokes),
    [keystrokes]
  );

  const performance = getPerformanceLabel(wpm, accuracy);
  const totalChars = keystrokes.length;
  const correctChars = totalChars - totalMistakes;

  // Determine target key if we are in Recovery mode
  const targetKey = useMemo(() => {
    const counts: Record<string, number> = {};
    let maxKey = 'R';
    let maxCount = 0;
    for (const ks of keystrokes) {
      const k = ks.expectedKey.toUpperCase();
      if (k && k !== ' ' && k.length === 1) {
        counts[k] = (counts[k] ?? 0) + 1;
        if (counts[k] > maxCount) {
          maxCount = counts[k];
          maxKey = k;
        }
      }
    }
    return maxKey;
  }, [keystrokes]);

  // Load baseline values for Recovery mode
  const baseline = useMemo(() => {
    const cached = localStorage.getItem(`recovery_baseline_${targetKey}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      baselineErrorRate: 25,
      accuracyLoss: 3.2,
      predictedWpmGain: 4
    };
  }, [targetKey]);

  // Calculate stats for Recovery mode completion
  const targetKeyErrorRate = useMemo(() => {
    const targetKeystrokes = keystrokes.filter(k => k.expectedKey.toUpperCase() === targetKey);
    const total = targetKeystrokes.length;
    const mistakes = targetKeystrokes.filter(k => k.isMistake).length;
    return total > 0 ? (mistakes / total) * 100 : (100 - accuracy);
  }, [keystrokes, targetKey, accuracy]);

  const targetKeyAccuracy = Math.min(100, Math.max(0, Math.round(100 - targetKeyErrorRate)));
  const accuracyImprovement = Math.max(0, Math.round(baseline.baselineErrorRate - targetKeyErrorRate));
  const estimatedWpmGain = Math.max(0, Math.round(baseline.predictedWpmGain * (accuracyImprovement / (baseline.baselineErrorRate || 1))));

  // Weakness detection criteria:
  // - Accuracy < 95% OR Top weak key has 3+ mistakes OR A confusion pair appears 2+ times
  const hasWeakness = useMemo(() => {
    if (mode === 'Recovery') return false; // Don't chain recovery within recovery indefinitely, recommend academy next
    return accuracy < 95 || (weakKeys.length > 0 && weakKeys[0].errors >= 3) || (topMistakePairs.length > 0 && topMistakePairs[0].count >= 2);
  }, [accuracy, weakKeys, topMistakePairs, mode]);

  // Derive top weak key & confusion pair for AI report
  const weakestKeyReport = useMemo(() => {
    if (weakKeys.length === 0) return null;
    const primaryWeak = weakKeys[0];
    const key = primaryWeak.key;
    const errors = primaryWeak.errors;
    const accLoss = parseFloat(((errors / (totalChars || 1)) * 100).toFixed(1));

    // Find the most frequent confusion pair for this weakest key
    const confusion = topMistakePairs.find(p => p.expected === key);
    const pressedKey = confusion ? confusion.pressed : (topMistakePairs.length > 0 ? topMistakePairs[0].pressed : 'None');

    const wpmGain = parseFloat(Math.min(8, (errors / (totalChars || 1)) * 20).toFixed(1));
    const severity = accLoss >= 3.0 ? 'High' : accLoss >= 1.5 ? 'Medium' : 'Low';

    return {
      key,
      pressedKey,
      errors,
      accLoss,
      wpmGain,
      severity
    };
  }, [weakKeys, topMistakePairs, totalChars]);

  // Generate a personalized improvement tip
  const getTip = (): string => {
    if (totalMistakes === 0) return 'Perfect session! No mistakes detected. Try a harder mode to push your ceiling.';
    if (accuracy < 85) return `Accuracy is below 85%. Slow down to ${Math.round(wpm * 0.8)} WPM and focus on precision. Speed will follow.`;
    if (backspaceCount > 10) return `You used backspace ${backspaceCount} times. Try to resist correcting — let mistakes flow and review them here instead.`;
    if (consistency < 70) return 'Rhythm is uneven. Try typing to a metronome or using the timed drill mode to even out your cadence.';
    if (weakKeys.length > 0) return `Your weakest key is "${weakKeys[0].key}" (${weakKeys[0].errorRate}% error rate). Practice a recovery drill to fix it.`;
    return `Good session! You're at ${wpm} WPM on ${mode} mode (Tier ${difficulty}). Push for ${wpm + 5} WPM next time.`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500 space-y-6">
      {/* ── Header ── */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-brand-border/40 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-success/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Badge */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-2xl bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center text-3xl">
              {mode === 'Recovery' ? '🩹' : performance.emoji}
            </div>
            <span className={`text-xs font-black uppercase tracking-widest ${mode === 'Recovery' ? 'text-brand-warning' : performance.color}`}>
              {mode === 'Recovery' ? 'Recovery Mode' : performance.label}
            </span>
          </div>

          {/* Title */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-brand-success" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {mode === 'Recovery' ? 'Recovery Practice Complete' : 'Session Complete'}
              </h2>
            </div>
            <p className="text-sm text-brand-muted">
              {mode === 'Recovery' ? `Target Key: ${targetKey}` : `${mode} mode · Tier ${difficulty}`} · {totalChars} characters typed
            </p>

            {/* Improvement tip */}
            <div className="mt-4 bg-brand-primary/8 border border-brand-primary/20 rounded-xl p-3 text-xs text-brand-text/90 leading-relaxed">
              <span className="font-black text-brand-primary mr-1.5">💡 Coach:</span>
              {mode === 'Recovery'
                ? `Excellent effort! You targeted "${targetKey}". Your target key accuracy reached ${targetKeyAccuracy}% during this session.`
                : getTip()
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── Recovery Mode Metrics (Dedicated Card) ── */}
      {mode === 'Recovery' && (
        <div className="glass-panel p-6 rounded-2xl border border-brand-warning/30 bg-gradient-to-br from-brand-warning/5 to-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-24 h-24 text-brand-warning" />
          </div>
          <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-brand-border/30 pb-3 mb-4">
            <Sparkles className="w-5 h-5 text-brand-warning animate-pulse" />
            Recovery Session Performance
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950/45 p-4 rounded-xl border border-brand-warning/20">
              <span className="text-[10px] text-brand-muted uppercase tracking-wider font-bold block mb-1">Target Key Accuracy</span>
              <div className="text-3xl font-black font-mono text-brand-warning">{targetKeyAccuracy}%</div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-brand-warning transition-all"
                  style={{ width: `${targetKeyAccuracy}%` }}
                />
              </div>
            </div>
            <div className="bg-slate-950/45 p-4 rounded-xl border border-brand-border/20">
              <span className="text-[10px] text-brand-muted uppercase tracking-wider font-bold block mb-1">Accuracy Improvement</span>
              <div className="text-3xl font-black font-mono text-brand-success">+{accuracyImprovement}%</div>
              <span className="text-[9px] text-brand-muted mt-1 block">vs. baseline error ({Math.round(baseline.baselineErrorRate)}%)</span>
            </div>
            <div className="bg-slate-950/45 p-4 rounded-xl border border-brand-border/20">
              <span className="text-[10px] text-brand-muted uppercase tracking-wider font-bold block mb-1">Estimated WPM Gain</span>
              <div className="text-3xl font-black font-mono text-cyan-400">+{estimatedWpmGain} WPM</div>
              <span className="text-[9px] text-brand-muted mt-1 block">potential recovery speed</span>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Recovery Diagnosis Report Card (Normal Sessions with Weakness) ── */}
      {mode !== 'Recovery' && weakestKeyReport && (
        <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 relative overflow-hidden">
          <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-brand-border/30 pb-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-brand-danger animate-pulse" />
            AI Weak-Key Diagnosis
          </h3>
          {hasWeakness ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Report Metrics */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-950/35 p-3 rounded-xl border border-brand-border/25">
                  <span className="text-xs font-semibold text-brand-muted">Weakest Key:</span>
                  <span className="text-sm font-black text-brand-danger bg-brand-danger/10 px-2.5 py-0.5 rounded border border-brand-danger/20 font-mono">
                    {weakestKeyReport.key}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/35 p-3 rounded-xl border border-brand-border/25">
                  <span className="text-xs font-semibold text-brand-muted">Common Confusion:</span>
                  <span className="text-xs font-bold text-white font-mono">
                    {weakestKeyReport.key} &rarr; {weakestKeyReport.pressedKey}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/35 p-3 rounded-xl border border-brand-border/25">
                  <span className="text-xs font-semibold text-brand-muted">Mistakes:</span>
                  <span className="text-sm font-black text-white font-mono">{weakestKeyReport.errors}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/35 p-3 rounded-xl border border-brand-border/25">
                  <span className="text-xs font-semibold text-brand-muted">Accuracy Loss:</span>
                  <span className="text-sm font-bold text-brand-danger font-mono">-{weakestKeyReport.accLoss}%</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/35 p-3 rounded-xl border border-brand-border/25">
                  <span className="text-xs font-semibold text-brand-muted">Estimated WPM Gain:</span>
                  <span className="text-sm font-bold text-brand-success font-mono">+{weakestKeyReport.wpmGain} WPM</span>
                </div>
              </div>

              {/* Priority & Interactive Meter */}
              <div className="flex flex-col justify-between bg-slate-950/20 p-4 rounded-xl border border-brand-border/30">
                <div>
                  <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider block mb-1">Recovery Priority</span>
                  <div className={`text-2xl font-black ${
                    weakestKeyReport.severity === 'High' ? 'text-brand-danger' : weakestKeyReport.severity === 'Medium' ? 'text-brand-warning' : 'text-brand-success'
                  }`}>
                    {weakestKeyReport.severity}
                  </div>
                  <p className="text-xs text-brand-muted mt-2 leading-relaxed">
                    This key accounts for {weakestKeyReport.accLoss}% accuracy drop. Practicing its recovery drill can yield up to +{weakestKeyReport.wpmGain} WPM speed gain.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-brand-border/20 flex items-center justify-between">
                  <span className="text-xs text-brand-muted">Recovery Score Meter:</span>
                  <div className="flex gap-1.5">
                    <span className={`w-3 h-3 rounded-full ${weakestKeyReport.accLoss >= 0.5 ? 'bg-brand-danger animate-pulse' : 'bg-brand-border'}`} />
                    <span className={`w-3 h-3 rounded-full ${weakestKeyReport.accLoss >= 1.5 ? 'bg-brand-warning' : 'bg-brand-border'}`} />
                    <span className={`w-3 h-3 rounded-full ${weakestKeyReport.accLoss >= 3.0 ? 'bg-brand-danger' : 'bg-brand-border'}`} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center bg-brand-success/5 border border-brand-success/20 rounded-xl w-full">
              <ShieldCheck className="w-10 h-10 text-brand-success mx-auto mb-2" />
              <p className="text-sm text-white font-bold">Great session — no major weak key detected.</p>
              <p className="text-xs text-brand-muted mt-1">Keep practicing to build your muscle memory consistency.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Primary Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'WPM', value: wpm, sub: `${rawWpm} raw`, color: 'text-brand-primary', icon: <Zap className="w-4 h-4" /> },
          { label: 'Accuracy', value: `${accuracy}%`, sub: `${correctChars}/${totalChars} correct`, color: 'text-brand-success', icon: <Target className="w-4 h-4" /> },
          { label: 'Consistency', value: `${consistency}%`, sub: 'rhythm score', color: 'text-brand-warning', icon: <Activity className="w-4 h-4" /> },
          { label: 'Focus', value: `${focusScore}%`, sub: 'no-pause score', color: 'text-indigo-300', icon: <TrendingUp className="w-4 h-4" /> },
          { label: 'Mistakes', value: totalMistakes, sub: `${backspaceCount} backspaces`, color: totalMistakes === 0 ? 'text-brand-success' : 'text-brand-danger', icon: <AlertTriangle className="w-4 h-4" /> },
          { label: 'Avg Delay', value: `${avgReactionMs}ms`, sub: 'key reaction', color: 'text-cyan-400', icon: <Clock className="w-4 h-4" /> },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label} className="glass-panel p-4 rounded-xl border border-brand-border/40 text-center">
            <div className={`flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${color}`}>
              {icon} {label}
            </div>
            <div className={`text-2xl font-black font-mono ${color}`}>{value}</div>
            <div className="text-[9px] text-brand-muted mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Detail Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Confusion Pairs */}
        <div className="glass-panel p-6 rounded-2xl border border-brand-border/40">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-brand-border/30 pb-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-brand-danger" />
            Key Confusion Pairs
          </h3>
          {topMistakePairs.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-brand-success mx-auto mb-2" />
              <p className="text-xs text-brand-muted">No key confusion detected — perfect session!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {topMistakePairs.map(({ pressed, expected, count }) => (
                <div key={`${pressed}-${expected}`} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 flex items-center justify-center bg-brand-success/10 border border-brand-success/30 rounded-lg font-black font-mono text-brand-success text-sm">
                      {expected}
                    </span>
                    <ChevronRight className="w-3 h-3 text-brand-muted" />
                    <span className="text-brand-muted text-[10px]">typed as</span>
                    <ChevronRight className="w-3 h-3 text-brand-muted" />
                    <span className="w-8 h-8 flex items-center justify-center bg-brand-danger/10 border border-brand-danger/30 rounded-lg font-black font-mono text-brand-danger text-sm">
                      {pressed}
                    </span>
                  </div>
                  <span className="font-bold font-mono text-brand-muted">
                    ×{count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weak Keys Heatbar */}
        <div className="glass-panel p-6 rounded-2xl border border-brand-border/40">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-brand-border/30 pb-3 mb-4">
            <Flame className="w-4 h-4 text-brand-warning" />
            Weak Key Breakdown
          </h3>
          {weakKeys.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-brand-success mx-auto mb-2" />
              <p className="text-xs text-brand-muted">All keys typed accurately this session!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weakKeys.map(({ key, errors, errorRate }) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 flex items-center justify-center bg-brand-card border border-brand-border rounded-lg font-black font-mono text-white text-sm">
                        {key}
                      </span>
                      <span className="text-brand-muted">{errors} mistake{errors !== 1 ? 's' : ''}</span>
                    </div>
                    <span className={`font-bold font-mono text-xs ${
                      errorRate >= 50 ? 'text-brand-danger' : errorRate >= 25 ? 'text-brand-warning' : 'text-amber-400'
                    }`}>
                    {errorRate}% error rate
                    </span>
                  </div>
                  <div className="w-full bg-brand-card rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        errorRate >= 50 ? 'bg-brand-danger' : errorRate >= 25 ? 'bg-brand-warning' : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, errorRate)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recommended Next Action CTA Box ── */}
      <div className="glass-panel p-6 rounded-2xl border border-brand-primary/20 bg-brand-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <span className="text-[10px] text-brand-primary font-bold uppercase tracking-wider block mb-1">Recommended Action</span>
          <h4 className="text-sm font-bold text-white">
            {hasWeakness
              ? `Targeted recovery drill for key "${weakestKeyReport?.key}" is recommended.`
              : 'Continue standard typing lessons to build speed and accuracy.'
            }
          </h4>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          {hasWeakness && onStartRecoveryPractice ? (
            <>
              <button
                onClick={onStartRecoveryPractice}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-warning hover:bg-brand-warning/90 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-brand-warning/15"
              >
                <Sparkles className="w-3.5 h-3.5 fill-slate-950/20" />
                Practice Recovery Drill
              </button>
              <button
                onClick={onNext}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-brand-border bg-brand-card/40 hover:bg-brand-card/85 text-brand-muted hover:text-white font-bold text-xs transition-all"
              >
                Continue Normally
              </button>
            </>
          ) : (
            <button
              onClick={onNavigateToAcademy || onNext}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs transition-all shadow-lg shadow-brand-primary/15"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              {onNavigateToAcademy ? 'Continue Academy Lesson' : 'Next Lesson'}
            </button>
          )}
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={onRetry}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-brand-border bg-brand-card/40 hover:bg-brand-card/80 text-brand-muted hover:text-white font-semibold text-sm transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Retry Same Session
        </button>

        <button
          onClick={onDashboard}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-brand-border bg-brand-card/40 hover:bg-brand-card/80 text-brand-muted hover:text-white font-semibold text-sm transition-all"
        >
          <LayoutDashboard className="w-4 h-4" />
          View Dashboard
        </button>

        <button
          onClick={onNext}
          className="w-full sm:flex-1 flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-sm transition-all shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40"
        >
          <ArrowRight className="w-4 h-4" />
          Next Lesson
        </button>
      </div>
    </div>
  );
}
