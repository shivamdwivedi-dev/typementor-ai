import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/AuthStore';
import { X, Clock, ShieldCheck, AlertTriangle, Trophy, Sparkles, ChevronRight, Zap } from 'lucide-react';

interface StreakFireWidgetProps {
  streak?: number;
}

export default function StreakFireWidget({ streak: propStreak }: StreakFireWidgetProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [animate, setAnimate] = useState(false);

  // Use user streak from auth store if available, fallback to prop
  const currentStreak = user?.streak !== undefined ? user.streak : (propStreak ?? 0);
  const longestStreak = Math.max(user?.longestStreak ?? 0, currentStreak);

  // Trigger bounce animation whenever streak increases
  useEffect(() => {
    setAnimate(true);
    const t = setTimeout(() => setAnimate(false), 600);
    return () => clearTimeout(t);
  }, [currentStreak]);

  // Close modal on Escape key
  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal]);

  // ── Real-Time Local Midnight Countdown ────────────────────────────────────
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    if (!showModal) return;
    // Tick every second while modal is open
    setNow(new Date());
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [showModal]);

  // Determine whether the user practiced TODAY in their local timezone
  const isPracticedToday = useMemo(() => {
    if (!user?.lastActiveAt) return false;
    const lastActive = new Date(user.lastActiveAt);
    if (isNaN(lastActive.getTime()) || lastActive.getTime() === 0) return false;

    return (
      lastActive.getFullYear() === now.getFullYear() &&
      lastActive.getMonth() === now.getMonth() &&
      lastActive.getDate() === now.getDate()
    );
  }, [user?.lastActiveAt, now]);

  // Countdown to next local midnight
  const timeDetails = useMemo(() => {
    const midnightTonight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0, 0, 0, 0
    );
    const diffMs = Math.max(0, midnightTonight.getTime() - now.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Percent of today that has elapsed
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const dayTotalMs = 24 * 60 * 60 * 1000;
    const elapsed = now.getTime() - startOfDay;
    const percentElapsed = Math.min(100, Math.max(0, Math.round((elapsed / dayTotalMs) * 100)));

    return { hours, minutes, seconds, totalSeconds, percentElapsed };
  }, [now]);

  // Detected timezone name
  const localTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time';
    } catch {
      return 'Local Time';
    }
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Next milestone calculation
  const nextMilestone = useMemo(() => {
    const milestones = [
      { days: 3, label: 'Bronze Flame', icon: '🥉' },
      { days: 7, label: 'Dedicated Typist', icon: '🏅' },
      { days: 14, label: 'Speed Habit', icon: '⚡' },
      { days: 30, label: 'Iron Fingers', icon: '💪' },
      { days: 100, label: 'Typing Legend', icon: '👑' },
    ];
    return milestones.find(m => m.days > currentStreak) || milestones[milestones.length - 1];
  }, [currentStreak]);

  const daysToMilestone = Math.max(0, nextMilestone.days - currentStreak);

  // Header flame appearance
  const flameSize = currentStreak === 0 ? 'text-lg' : currentStreak < 7 ? 'text-xl' : currentStreak < 30 ? 'text-2xl' : 'text-3xl';
  const glowColor = currentStreak === 0
    ? ''
    : currentStreak < 7
    ? 'drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]'
    : currentStreak < 30
    ? 'drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]'
    : 'drop-shadow-[0_0_14px_rgba(234,179,8,1)]';

  const streakLabel = currentStreak === 0 ? 'No streak' : currentStreak === 1 ? '1 day' : `${currentStreak} days`;

  const handleStartPractice = () => {
    setShowModal(false);
    navigate('/practice');
  };

  return (
    <>
      {/* ── Widget Trigger Button in Top Nav ──────────────────────────────── */}
      <button
        onClick={() => setShowModal(true)}
        type="button"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 select-none cursor-pointer
          ${currentStreak > 0
            ? isPracticedToday
              ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
              : 'border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 animate-pulse'
            : 'border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400'}
          ${animate ? 'scale-110' : 'scale-100'}`}
        title={`${streakLabel} streak • Click for countdown & details`}
        aria-label={`${streakLabel} streak`}
      >
        <span className={`${flameSize} ${glowColor} transition-all duration-300 ${currentStreak > 0 ? 'animate-pulse' : ''}`}>
          🔥
        </span>
        <span className="text-sm font-bold font-mono">
          {currentStreak}
        </span>
      </button>

      {/* ── Modal Dialog (Mounted to document.body via Portal to escape all parent stacking contexts) ── */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="streak-modal-title"
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
          onClick={() => setShowModal(false)}
          onMouseDown={() => setShowModal(false)}
        >
          {/* Modal Container — stop propagation so clicks INSIDE the card don't close */}
          <div
            className="relative w-full max-w-md my-auto rounded-3xl border border-zinc-700/60 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 p-6 sm:p-7 text-center shadow-2xl transition-all select-none"
            style={{
              boxShadow: currentStreak > 0
                ? isPracticedToday
                  ? '0 0 50px rgba(16,185,129,0.25), 0 20px 40px rgba(0,0,0,0.8)'
                  : '0 0 50px rgba(249,115,22,0.3), 0 20px 40px rgba(0,0,0,0.8)'
                : '0 20px 40px rgba(0,0,0,0.8)',
            }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            {/* Top-Right Close Button — easily accessible on ALL screen sizes */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              aria-label="Close streak details"
              className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all z-20 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Flame Icon with Dynamic Aura */}
            <div className="relative inline-flex items-center justify-center mb-3">
              <div
                className={`text-6xl transition-transform duration-300 drop-shadow-[0_0_25px_rgba(251,146,60,0.8)] ${
                  currentStreak > 0 ? 'animate-bounce' : 'opacity-70'
                }`}
              >
                🔥
              </div>
            </div>

            {/* Streak Number & Headline */}
            <h2 id="streak-modal-title" className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">
              {currentStreak > 0 ? (
                <span>
                  <span className="text-orange-400 font-mono text-3xl sm:text-4xl mr-1.5">{currentStreak}</span>
                  Day Streak
                </span>
              ) : (
                <span className="text-zinc-300">Start Your Streak</span>
              )}
            </h2>

            {/* Status Pill (Extended vs At Risk vs Ready) */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 mt-1">
              {currentStreak > 0 && isPracticedToday ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Protected for Today! Next Day at Midnight
                </span>
              ) : currentStreak > 0 ? (
                <span className="bg-orange-500/20 text-orange-300 border border-orange-500/50 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  At Risk: Practice Needed Today!
                </span>
              ) : (
                <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Ready to Ignite
                </span>
              )}
            </div>

            {/* ── Precise Countdown Clock ───────────────────────────────── */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 mb-4 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2.5 px-1">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  {isPracticedToday ? 'Next practice day begins in:' : 'Streak expires in:'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Midnight • {localTimeZone.split('/').pop()?.replace('_', ' ')}
                </span>
              </div>

              {/* Digital Timer Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl py-2 px-1 flex flex-col items-center shadow-inner">
                  <span className={`text-2xl font-black font-mono tracking-tight ${isPracticedToday ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {pad(timeDetails.hours)}
                  </span>
                  <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider mt-0.5">Hours</span>
                </div>
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl py-2 px-1 flex flex-col items-center shadow-inner">
                  <span className={`text-2xl font-black font-mono tracking-tight ${isPracticedToday ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {pad(timeDetails.minutes)}
                  </span>
                  <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider mt-0.5">Minutes</span>
                </div>
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl py-2 px-1 flex flex-col items-center shadow-inner">
                  <span className={`text-2xl font-black font-mono tracking-tight ${isPracticedToday ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {pad(timeDetails.seconds)}
                  </span>
                  <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider mt-0.5">Seconds</span>
                </div>
              </div>

              {/* Day Progress Meter */}
              <div className="mt-3 pt-2.5 border-t border-zinc-800/60">
                <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1">
                  <span>Day Elapsed</span>
                  <span className="font-mono text-zinc-300">{timeDetails.percentElapsed}%</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      isPracticedToday ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-500 to-red-500'
                    }`}
                    style={{ width: `${timeDetails.percentElapsed}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Explanatory Trust Card */}
            <div className="text-left bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3.5 mb-4 text-xs space-y-1.5">
              <div className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300">
                  <strong className="text-white">How Streaks Work:</strong> Complete at least 1 practice session or academy lesson every calendar day.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Trophy className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300">
                  <strong className="text-white">Personal Best:</strong> {longestStreak} {longestStreak === 1 ? 'day' : 'days'}.
                </span>
              </div>
              {daysToMilestone > 0 && currentStreak > 0 && (
                <div className="flex items-start gap-2 pt-1 border-t border-zinc-800/60">
                  <span className="text-sm flex-shrink-0">{nextMilestone.icon}</span>
                  <span className="text-zinc-400">
                    <strong className="text-zinc-200">{daysToMilestone} days</strong> until {nextMilestone.label} badge!
                  </span>
                </div>
              )}
            </div>

            {/* Milestone Roadmap */}
            <div className="grid grid-cols-5 gap-1.5 mb-5 text-center">
              {[
                { days: 3, icon: '🥉', label: '3d' },
                { days: 7, icon: '🏅', label: '7d' },
                { days: 14, icon: '⚡', label: '14d' },
                { days: 30, icon: '💪', label: '30d' },
                { days: 100, icon: '👑', label: '100d' },
              ].map(m => {
                const isReached = currentStreak >= m.days;
                return (
                  <div
                    key={m.days}
                    className={`rounded-xl p-2 border transition-all ${
                      isReached
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-300 shadow-sm'
                        : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500 opacity-60'
                    }`}
                  >
                    <div className="text-base mb-0.5">{m.icon}</div>
                    <div className="text-[10px] font-bold">{m.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Primary Action Button */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleStartPractice}
                className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 active:scale-[0.99] text-zinc-950 text-sm font-extrabold shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isPracticedToday ? 'Keep Practicing & Earn XP' : 'Practice Now to Save Streak'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1 cursor-pointer"
              >
                Click outside or press Esc to close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
