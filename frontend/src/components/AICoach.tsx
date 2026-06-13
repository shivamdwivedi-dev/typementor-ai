import { useEffect, useState, useRef } from 'react';
import { BrainCircuit, Sparkles, RefreshCw, ArrowRight, ShieldAlert } from 'lucide-react';
import { useTypingStore } from '../store/TypingStore';
import { extractWeakKeys } from '../utils/lessonEngine';
import { getApiUrl } from '../utils/api';

interface AICoachProps {
  onGenerateCustomLesson?: (keys: string[]) => void;
}

// Derive a local insight from keystrokes — no network required
function buildLocalInsight(
  keystrokes: { expectedKey: string; actualKey: string; isMistake: boolean; reactionTime: number }[],
  wpm: number,
  accuracy: number,
): { insight: string; riskKeys: Record<string, number> } {
  if (keystrokes.length < 10) {
    return {
      insight: 'Start a typing session and I\'ll analyze your keystrokes in real time to build a personalized coaching plan.',
      riskKeys: {},
    };
  }

  // Build error map
  const errors: Record<string, number> = {};
  const totals: Record<string, number> = {};
  const confusions: Record<string, Record<string, number>> = {};

  for (const ks of keystrokes) {
    const exp = ks.expectedKey.toUpperCase();
    totals[exp] = (totals[exp] ?? 0) + 1;
    if (ks.isMistake) {
      errors[exp] = (errors[exp] ?? 0) + 1;
      if (!confusions[exp]) confusions[exp] = {};
      const act = ks.actualKey.toUpperCase();
      confusions[exp][act] = (confusions[exp][act] ?? 0) + 1;
    }
  }

  // Build risk keys (error rate as a 0-100 score)
  const riskKeys: Record<string, number> = {};
  for (const [key, errCount] of Object.entries(errors)) {
    const rate = Math.round((errCount / (totals[key] ?? 1)) * 100);
    if (rate >= 15 && (totals[key] ?? 0) >= 2) {
      riskKeys[key] = Math.min(99, rate + 40); // normalize to feel like a risk score
    }
  }

  // Sort by risk
  const sortedRisk = Object.entries(riskKeys).sort((a, b) => b[1] - a[1]);

  let insight = '';

  if (sortedRisk.length === 0) {
    if (accuracy >= 97) {
      insight = `Outstanding accuracy at ${accuracy}%! Your keystroke patterns are clean. Focus on pushing your speed from ${wpm} WPM toward ${wpm + 8} WPM without sacrificing precision.`;
    } else if (accuracy >= 90) {
      insight = `Solid session at ${wpm} WPM with ${accuracy}% accuracy. No dominant weak keys detected. Work on rhythm consistency — uneven cadence causes hesitation errors over time.`;
    } else {
      insight = `Your session shows scattered errors with no single dominant weak key — this usually means you're typing at the edge of your comfort speed. Try dropping 10 WPM and rebuilding confidence.`;
    }
  } else {
    const topKey = sortedRisk[0][0];
    const topConf = confusions[topKey] ? Object.entries(confusions[topKey]).sort((a, b) => b[1] - a[1])[0] : null;
    const confStr = topConf ? ` (often typed "${topConf[0]}" instead)` : '';

    if (sortedRisk.length >= 3) {
      const keys = sortedRisk.slice(0, 3).map(([k]) => k).join(', ');
      insight = `I detected recurring errors on keys ${keys}. "${topKey}"${confStr} is your biggest gap — this typically means finger reach is off. Generate a targeted drill to train the exact muscle pattern.`;
    } else if (sortedRisk.length === 2) {
      const k2 = sortedRisk[1][0];
      insight = `Two key areas need work: "${topKey}"${confStr} and "${k2}". These often appear together because they share the same finger or hand. A combined drill will fix both efficiently.`;
    } else {
      insight = `"${topKey}" is your main weak key this session${confStr}. Isolated drills that force this key in varied contexts will lock in the right muscle memory within 10 focused sessions.`;
    }
  }

  return { insight, riskKeys };
}

export default function AICoach({ onGenerateCustomLesson }: AICoachProps) {
  const { keystrokes, wpm, accuracy, isCompleted } = useTypingStore();
  const [insight, setInsight] = useState<string>('Start a typing session and I\'ll analyze your keystrokes in real time.');
  const [riskKeys, setRiskKeys] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  // Track last session we fetched server insights for — avoid spamming API
  const lastServerFetchAt = useRef<number>(0);

  // ── Derive local insights whenever a session completes ─────────────────────
  useEffect(() => {
    if (!isCompleted || keystrokes.length === 0) return;
    const local = buildLocalInsight(keystrokes, wpm, accuracy);
    setInsight(local.insight);
    setRiskKeys(local.riskKeys);
  }, [isCompleted]);

  // ── Also hit the server for richer cross-session insights (throttled) ──────
  const fetchServerInsights = async () => {
    const token = localStorage.getItem('typementor_token');
    if (!token) return; // guests get local-only insights

    const now = Date.now();
    if (now - lastServerFetchAt.current < 10_000) return; // debounce 10 s
    lastServerFetchAt.current = now;

    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/coach/insights'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.insights) setInsight(data.insights);
        if (data.riskKeys && Object.keys(data.riskKeys).length > 0) setRiskKeys(data.riskKeys);
      }
    } catch (e) {
      console.error('Coach insights fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCompleted) fetchServerInsights();
  }, [isCompleted]);

  const handleDrillClick = () => {
    if (onGenerateCustomLesson) {
      const weakKeys = extractWeakKeys(keystrokes);
      const keys = weakKeys.length > 0
        ? weakKeys.slice(0, 3)
        : Object.keys(riskKeys).slice(0, 3).length > 0
          ? Object.keys(riskKeys).slice(0, 3)
          : ['T', 'R', 'Y'];
      onGenerateCustomLesson(keys);
    }
  };

  const getRiskColor = (prob: number) => {
    if (prob >= 80) return 'text-brand-danger bg-brand-danger/10 border-brand-danger/25';
    if (prob >= 60) return 'text-brand-warning bg-brand-warning/10 border-brand-warning/25';
    return 'text-brand-primary bg-brand-primary/10 border-brand-primary/25';
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-brand-border/30 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-brand-primary/15 p-2 rounded-xl text-brand-primary border border-brand-primary/10 animate-pulse">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base">Adaptive AI Coach</h3>
            <p className="text-[10px] text-brand-muted font-medium uppercase tracking-wider">Live keystroke diagnostics</p>
          </div>
        </div>

        <button
          onClick={fetchServerInsights}
          disabled={loading}
          className="text-brand-muted hover:text-white p-2 rounded-lg border border-brand-border hover:bg-brand-card/65 transition-all"
          title="Refresh cross-session insights"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-5">
        {/* Insight bubble */}
        <div className="relative bg-brand-bg/50 border border-brand-border/40 p-4 rounded-2xl">
          <span className="absolute -left-2 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-brand-border/40 border-b-8 border-b-transparent" />
          <p className="text-xs sm:text-sm text-brand-text/90 leading-relaxed font-medium">
            "{insight}"
          </p>
        </div>

        {/* Risk keys — only show when we have real data */}
        {Object.keys(riskKeys).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-muted uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-brand-warning" />
              <span>Weak Keys This Session</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {Object.entries(riskKeys)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([key, prob]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${getRiskColor(prob)}`}
                  >
                    <span className="text-lg font-black font-mono leading-none">{key}</span>
                    <span className="text-[10px] font-bold mt-1.5 font-mono">{prob}% Risk</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* No data yet state */}
        {Object.keys(riskKeys).length === 0 && (
          <div className="py-2 text-center text-[11px] text-brand-muted">
            Complete a session to see your weak key analysis here.
          </div>
        )}

        {/* Drill button */}
        <button
          onClick={handleDrillClick}
          className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/30 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 group border border-indigo-400/20"
        >
          <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          Generate Targeted Drill
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
