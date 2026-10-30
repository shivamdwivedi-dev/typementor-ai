import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/AuthStore';
import { showPrToast } from '../utils/toastHelper';
import { useBodyScrollLock } from '../utils/scrollLock';
import {
  Clock,
  Flame,
  Trophy,
  Sparkles,
  Bell,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowLeft,
  Crown,
} from 'lucide-react';

export interface DailyFocusRecord {
  date: string; // YYYY-MM-DD
  secondsToday: number;
  goalSeconds: number; // default 600 (10 min)
  milestone5mNotified: boolean;
  milestone10mNotified: boolean;
  dailyGoalCompleted: boolean;
}

const GOAL_SECONDS = 600; // 10 minutes

// Helper to get local date key "YYYY-MM-DD"
export function getLocalDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Web Audio API chime for milestone celebrations
function playGoalChime(frequency = 587.33, type: OscillatorType = 'triangle', duration = 0.4) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio context not allowed or unsupported
  }
}

export function playGoalCelebrationFanfare() {
  playGoalChime(440, 'triangle', 0.2);
  setTimeout(() => playGoalChime(554.37, 'triangle', 0.2), 150);
  setTimeout(() => playGoalChime(659.25, 'triangle', 0.3), 300);
  setTimeout(() => playGoalChime(880, 'sine', 0.6), 450);
}

// Confetti Component for 10-minute celebration
function ConfettiOverlay({ onClose }: { onClose: () => void }) {
  const particles = useMemo(() => {
    const colors = ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
    return Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: colors[i % colors.length],
      size: `${Math.floor(Math.random() * 8) + 6}px`,
      duration: `${(Math.random() * 1.5 + 2).toFixed(2)}s`,
      delay: `${(Math.random() * 0.4).toFixed(2)}s`,
      rotation: `${Math.floor(Math.random() * 360)}deg`,
    }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[10000] overflow-hidden">
      <style>{`
        @keyframes dailyGoalConfettiFall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `dailyGoalConfettiFall ${p.duration} linear forwards`,
            animationDelay: p.delay,
            transform: `rotate(${p.rotation})`,
          }}
        />
      ))}
    </div>
  );
}

export function loadDailyFocusRecord(userId?: string): DailyFocusRecord {
  const todayKey = getLocalDateKey();
  const storageKey = `typementor_daily_focus_${userId || 'guest'}_${todayKey}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === todayKey) {
        return parsed;
      }
    }
  } catch {}

  return {
    date: todayKey,
    secondsToday: 0,
    goalSeconds: GOAL_SECONDS,
    milestone5mNotified: false,
    milestone10mNotified: false,
    dailyGoalCompleted: false,
  };
}

export function saveDailyFocusRecord(record: DailyFocusRecord, userId?: string) {
  const storageKey = `typementor_daily_focus_${userId || 'guest'}_${record.date}`;
  try {
    localStorage.setItem(storageKey, JSON.stringify(record));
  } catch {}
}

interface DailyGoalTrackerProps {
  className?: string;
  onGoalCompleted?: () => void;
}

export default function DailyGoalTracker({ className = '', onGoalCompleted }: DailyGoalTrackerProps) {
  const { user, isAuthenticated, updateUserStats } = useAuthStore();
  const userId = user?.id;

  const [record, setRecord] = useState<DailyFocusRecord>(() => loadDailyFocusRecord(userId));
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'unsupported'>('default');

  // Prevent background scroll when details modal is open
  useBodyScrollLock(showDetailModal);

  // Keyboard navigation: Backspace or Escape returns to practice mode
  useEffect(() => {
    if (!showDetailModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowDetailModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showDetailModal]);

  // Check notification support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationStatus(Notification.permission);
    } else {
      setNotificationStatus('unsupported');
    }
  }, []);

  // Sync on user change or day change
  useEffect(() => {
    setRecord(loadDailyFocusRecord(userId));
  }, [userId]);

  // Listen to cross-window or internal storage events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      const todayKey = getLocalDateKey();
      if (e.key === `typementor_daily_focus_${userId || 'guest'}_${todayKey}` && e.newValue) {
        try {
          setRecord(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [userId]);

  // Midnight countdown calculation
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeToMidnight = useMemo(() => {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const diffMs = Math.max(0, midnight.getTime() - now.getTime());
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    return { hours, mins, secs, diffMs };
  }, [now]);

  // Handle adding seconds
  const addActiveDuration = useCallback((seconds: number) => {
    if (seconds <= 0) return;

    setRecord(prev => {
      const todayKey = getLocalDateKey();
      // If date rolled over, start fresh
      const currentRec = prev.date === todayKey ? prev : loadDailyFocusRecord(userId);
      const nextSeconds = currentRec.secondsToday + seconds;
      const reached5m = nextSeconds >= 300;
      const reached10m = nextSeconds >= GOAL_SECONDS;

      const updated: DailyFocusRecord = {
        ...currentRec,
        date: todayKey,
        secondsToday: nextSeconds,
        dailyGoalCompleted: reached10m,
      };

      // Milestone 1: 5 minutes (300 seconds)
      if (reached5m && !currentRec.milestone5mNotified) {
        updated.milestone5mNotified = true;
        playGoalChime(523.25, 'triangle', 0.3);
        showPrToast('⚡ 5 MINUTES COMPLETED! Halfway to your daily 10-minute focus goal!');
      }

      // Milestone 2: 10 minutes (600 seconds)
      if (reached10m && !currentRec.milestone10mNotified) {
        updated.milestone10mNotified = true;
        playGoalCelebrationFanfare();
        setShowConfetti(true);
        showPrToast('🏆 10-MINUTE DAILY GOAL CRUSHED! Day Streak Secured +50 XP Bonus!');

        if (isAuthenticated && user) {
          updateUserStats({
            xp: (user.xp || 0) + 50,
          });
        }
        if (onGoalCompleted) {
          onGoalCompleted();
        }
      }

      saveDailyFocusRecord(updated, userId);
      return updated;
    });
  }, [userId, isAuthenticated, user, updateUserStats, onGoalCompleted]);

  // Expose function globally so PracticeBoard can feed duration on session complete
  useEffect(() => {
    (window as any).__typementor_add_daily_practice_seconds = addActiveDuration;
    return () => {
      delete (window as any).__typementor_add_daily_practice_seconds;
    };
  }, [addActiveDuration]);

  // Calculate percentage and formats
  const percent = Math.min(100, Math.round((record.secondsToday / GOAL_SECONDS) * 100));
  const minutesTyped = Math.floor(record.secondsToday / 60);
  const secondsRemainder = Math.floor(record.secondsToday % 60);
  const formattedTime = `${minutesTyped}:${String(secondsRemainder).padStart(2, '0')}`;
  const isGoalReached = record.secondsToday >= GOAL_SECONDS;

  // Request notification permission
  const handleEnableReminders = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
      if (permission === 'granted') {
        showPrToast('🔔 Daily reminders active! We will help you maintain your 10-min streak.');
        new Notification('TypeMentor Habit Reminder', {
          body: '🎯 Your 10-minute daily typing focus goal is now locked in. Practice daily to level up!',
          icon: '/favicon.ico',
        });
      }
    } catch {
      setNotificationStatus('denied');
    }
  };

  return (
    <>
      {/* ── Compact Progress Pill in Header ── */}
      <button
        type="button"
        onClick={() => setShowDetailModal(true)}
        className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-mono font-semibold select-none cursor-pointer ${
          isGoalReached
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
            : record.secondsToday >= 300
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-cyan-500/30 hover:text-white'
        } ${className}`}
        title={`Daily Focus Goal: ${formattedTime} / 10:00 (${percent}%). Click to open daily habit details.`}
      >
        {isGoalReached ? (
          <Trophy className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20 animate-bounce" />
        ) : (
          <Clock className={`w-3.5 h-3.5 ${record.secondsToday >= 300 ? 'text-amber-400' : 'text-cyan-400'}`} />
        )}

        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline font-sans text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            {isGoalReached ? '10m Crushed' : 'Focus'}
          </span>
          <span className="font-mono font-bold text-xs">{formattedTime}</span>
          <span className="text-slate-500 font-mono text-[10px]">/ 10m</span>
        </div>

        {/* Mini progress bar under pill */}
        <div className="w-8 sm:w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-0.5 hidden sm:block">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isGoalReached ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-cyan-400'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {isGoalReached && (
          <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
            +50 XP
          </span>
        )}
      </button>

      {/* ── Confetti Explosion on 10m Achievement ── */}
      {showConfetti && <ConfettiOverlay onClose={() => setShowConfetti(false)} />}

      {/* ── Daily Focus Modal (Portaled directly to document.body) ── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showDetailModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              onClick={() => setShowDetailModal(false)}
              className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl select-none"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 14 }}
                transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-md bg-zinc-950/90 backdrop-blur-3xl border border-zinc-800/90 rounded-3xl p-6 sm:p-7 shadow-[0_25px_90px_rgba(0,0,0,0.9),0_0_50px_rgba(6,182,212,0.18)] text-zinc-100 overflow-hidden"
              >
                {/* Top Regal Neon Line */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

                {/* Symmetrical Top Navigation Row */}
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] sm:text-xs font-royal font-bold tracking-[0.16em] uppercase">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>DAILY FOCUS DISCIPLINE</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
                    aria-label="Close"
                    title="Return to Practice (Backspace or Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Royal Crown / Header */}
                <div className="text-center mb-2">
                  <Crown className="w-5 h-5 text-amber-400 mx-auto drop-shadow-[0_0_12px_rgba(245,158,11,0.5)] mb-1" />
                  <h3 className="font-royal font-black text-xl sm:text-2xl text-white uppercase tracking-[0.06em] bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                    10-MINUTE DAILY GOAL
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans mt-0.5">
                    Build permanent tactile muscle memory with consistent daily practice
                  </p>
                </div>

                {/* Progress Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 my-3.5 space-y-3 backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <span className="font-royal text-[10px] font-bold text-zinc-400 uppercase tracking-[0.16em]">
                      TODAY'S ACTIVE TIME
                    </span>
                    <span className="font-royal text-xs font-black text-cyan-400 tracking-wider">
                      {percent}% COMPLETED
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="font-royal text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">{formattedTime}</span>
                    <span className="font-royal text-xs font-bold text-zinc-400 uppercase tracking-widest">/ 10:00 MIN</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isGoalReached
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5 font-mono">
                    <span className={record.secondsToday >= 300 ? 'text-amber-400 font-bold' : ''}>
                      {record.secondsToday >= 300 ? '✓ 5m Halfway' : '• 5m Halfway'}
                    </span>
                    <span className={isGoalReached ? 'text-emerald-400 font-bold' : ''}>
                      {isGoalReached ? '✓ 10m Goal Crushed (+50 XP)' : '• 10m Goal (+50 XP)'}
                    </span>
                  </div>
                </div>

                {/* Midnight Reset Countdown */}
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/70 flex items-center justify-between text-xs backdrop-blur-md">
                  <div className="flex items-center gap-2.5">
                    {timeToMidnight.hours < 3 && !isGoalReached ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <Flame className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    )}
                    <div>
                      <span className="font-royal font-bold text-zinc-200 block uppercase tracking-wider text-[11px]">
                        MIDNIGHT RESET
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {timeToMidnight.hours}h {timeToMidnight.mins}m {timeToMidnight.secs}s remaining
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-royal font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${
                    isGoalReached
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  }`}>
                    {isGoalReached ? 'Streak Secured' : 'At Risk'}
                  </span>
                </div>

                {/* Daily Habit Retention & Reminder CTA */}
                <div className="mt-3.5 pt-3 border-t border-zinc-800/80 flex flex-col gap-2">
                  <div className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
                    <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[11px]">
                      <strong className="text-white">Tactile Memory Rule:</strong> Typing for 10 minutes daily creates 3x faster muscle memory retention than typing for 1 hour once a week.
                    </span>
                  </div>

                  {notificationStatus === 'default' && (
                    <button
                      type="button"
                      onClick={handleEnableReminders}
                      className="mt-1 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-royal font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Enable Daily 10-Minute Reminder</span>
                    </button>
                  )}

                  {notificationStatus === 'granted' && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 pt-0.5 font-sans">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Daily browser reminder is enabled</span>
                    </div>
                  )}
                </div>

                {/* Close / Action Button */}
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 text-slate-950 font-royal font-black text-xs uppercase tracking-[0.14em] transition-all shadow-[0_0_25px_rgba(6,182,212,0.35)] cursor-pointer"
                  >
                    CONTINUE PRACTICING
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="w-full flex items-center justify-center gap-2 text-[11px] font-royal font-bold uppercase tracking-[0.12em] text-zinc-400 hover:text-white transition-colors cursor-pointer py-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Practice</span>
                    <span className="text-zinc-600">•</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/80 font-mono text-[10px] text-zinc-300">
                      ⌫ Backspace
                    </kbd>
                    <span className="text-zinc-500 text-[10px]">or</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/80 font-mono text-[10px] text-zinc-300">
                      Esc
                    </kbd>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
