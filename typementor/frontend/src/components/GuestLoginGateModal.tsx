import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useBodyScrollLock } from '../utils/scrollLock';
import {
  Lock,
  Sparkles,
  Flame,
  Clock,
  Swords,
  BrainCircuit,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowLeft,
  Zap,
  Crown,
} from 'lucide-react';

export interface GuestLoginGateModalProps {
  isOpen: boolean;
  lastWpm?: number;
  lastAccuracy?: number;
  completedTests: number;
  maxFreeTests?: number;
  onClose?: () => void;
  onSignIn?: () => void;
}

export default function GuestLoginGateModal({
  isOpen,
  lastWpm = 0,
  lastAccuracy = 0,
  completedTests = 0,
  maxFreeTests = 2,
  onClose,
  onSignIn,
}: GuestLoginGateModalProps) {
  const navigate = useNavigate();

  // Prevent background scrolling while the modal is open
  useBodyScrollLock(isOpen);

  // Keyboard navigation: Backspace or Escape returns to practice mode
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user presses Backspace or Escape, return to practice
      if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (onClose) onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  const handleAction = () => {
    if (onSignIn) {
      onSignIn();
    } else {
      navigate('/auth', { state: { from: '/practice' } });
    }
  };

  const isLimitReached = completedTests >= maxFreeTests;
  const roundedWpm = Math.round(lastWpm);
  const roundedAcc = Math.round(lastAccuracy);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-gate-title"
          onClick={onClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl select-none"
        >
          {/* Glass Card Container with Royal Aesthetic */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 14 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-zinc-950/90 backdrop-blur-3xl border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-[0_25px_90px_rgba(0,0,0,0.9),0_0_60px_rgba(6,182,212,0.18)] text-zinc-100 overflow-hidden"
          >
            {/* Top Border Regal Neon Highlight */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

            {/* Ambient Fluid Glow Animation (Matches Neon-Flow / LiquidNavbar) */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.15, 0.28, 0.15],
                rotate: [0, 45, 0],
              }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-24 -left-24 w-72 h-72 bg-gradient-to-br from-blue-600/35 via-cyan-500/25 to-indigo-500/15 rounded-full blur-3xl pointer-events-none"
            />
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.12, 0.24, 0.12],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -bottom-24 -right-24 w-72 h-72 bg-gradient-to-tl from-cyan-500/30 via-blue-600/20 to-transparent rounded-full blur-3xl pointer-events-none"
            />

            {/* Top Header Status Row: Perfectly Aligned */}
            <div className="flex items-center justify-between w-full mb-4">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-royal font-bold tracking-[0.16em] uppercase border backdrop-blur-md ${
                  isLimitReached
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                }`}
              >
                {isLimitReached ? (
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                )}
                <span>
                  {isLimitReached
                    ? `GUEST LIMIT (${completedTests}/${maxFreeTests})`
                    : `GUEST PREVIEW (${completedTests}/${maxFreeTests} USED)`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/60 border border-zinc-800 text-[10px] font-royal font-bold tracking-wider text-emerald-400 uppercase">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Free
                </span>

                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 transition-all cursor-pointer"
                    aria-label="Close modal and return to practice"
                    title="Return to Practice (Backspace or Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Royal Crown Emblem */}
            <div className="text-center mb-1">
              <Crown className="w-5 h-5 text-amber-400/90 mx-auto drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
            </div>

            {/* Modal Title: Royal, Sharp, Bold Typography */}
            <h2
              id="guest-gate-title"
              className="font-royal font-black text-2xl sm:text-[28px] text-center uppercase tracking-[0.06em] leading-tight mb-2.5 bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(255,255,255,0.18)]"
            >
              {isLimitReached ? 'SAVE YOUR SPEED & CLAIM YOUR STREAK' : 'ELEVATE YOUR TYPING FLOW'}
            </h2>

            {/* Subtitle / Description */}
            <p className="text-xs sm:text-[13px] text-zinc-300 text-center max-w-md mx-auto leading-relaxed mb-4">
              {isLimitReached
                ? "You've completed your 2 free guest sessions. Create an account in 5 seconds to unlock unlimited typing and save your AI diagnostics."
                : 'Enjoying TypeMentor? Sign in to save your lifetime speed metrics, unlock the 10-minute focus engine, and climb the global ranks.'}
            </p>

            {/* Scored Metrics Card (if user has completed a run) */}
            {roundedWpm > 0 && (
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="my-3.5 p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-md flex items-center justify-between gap-4"
              >
                <div>
                  <span className="font-royal text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 block mb-0.5">
                    LATEST RUN RECORD
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-royal text-3xl sm:text-4xl font-black text-cyan-400 font-mono tracking-tight">{roundedWpm}</span>
                    <span className="font-royal text-xs text-zinc-400 font-bold uppercase tracking-wider">WPM</span>
                    <span className="text-zinc-600 mx-1">•</span>
                    <span className="font-royal text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">{roundedAcc}%</span>
                    <span className="font-royal text-xs text-zinc-400 font-bold uppercase tracking-wider">ACC</span>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="inline-flex items-center gap-1.5 text-xs font-royal font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl uppercase tracking-wider">
                    <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    High Speed
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-1">Ready for ranked ladder</span>
                </div>
              </motion.div>
            )}

            {/* Information Alert Box */}
            <div
              className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 mb-4 leading-relaxed backdrop-blur-md ${
                isLimitReached
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
              }`}
            >
              <span className="text-base leading-none">{isLimitReached ? '⚠️' : '💡'}</span>
              <span className="text-[11px] sm:text-xs">
                {isLimitReached ? (
                  <>
                    <strong className="font-bold text-amber-300">Don't lose your progress:</strong> Guest typing telemetry, weak-key diagnosis, and daily streak progress will reset permanently unless linked to an account.
                  </>
                ) : (
                  <>
                    <strong className="font-bold text-cyan-300">Guest Tip:</strong> Creating an account takes 5 seconds with Google and instantly syncs your active typing minutes into today's 10-minute focus goal!
                  </>
                )}
              </span>
            </div>

            {/* Value Proposition List: Sharp, Aligned, Royal Cards */}
            <div className="space-y-2 mb-5">
              <motion.div
                whileHover={{ x: 3 }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/70 hover:border-zinc-700/80 text-xs sm:text-sm text-zinc-200 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                  <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                </div>
                <div className="flex flex-col">
                  <span className="font-royal text-xs font-bold uppercase tracking-wider text-white">
                    Lock In Day 1 Daily Streak
                  </span>
                  <span className="text-[11px] text-zinc-400 font-sans">
                    Build tactile motor memory and protect daily consistency.
                  </span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ x: 3 }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/70 hover:border-zinc-700/80 text-xs sm:text-sm text-zinc-200 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex flex-col">
                  <span className="font-royal text-xs font-bold uppercase tracking-wider text-white">
                    10-Minute Daily Focus Goal
                  </span>
                  <span className="text-[11px] text-zinc-400 font-sans">
                    Reach 10 minutes of active practice to earn +50 XP bonus.
                  </span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ x: 3 }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/70 hover:border-zinc-700/80 text-xs sm:text-sm text-zinc-200 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <BrainCircuit className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex flex-col">
                  <span className="font-royal text-xs font-bold uppercase tracking-wider text-white">
                    AI Weak-Key Diagnosis
                  </span>
                  <span className="text-[11px] text-zinc-400 font-sans">
                    Pinpoint error keys and receive targeted neural recovery drills.
                  </span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ x: 3 }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/70 hover:border-zinc-700/80 text-xs sm:text-sm text-zinc-200 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                  <Swords className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex flex-col">
                  <span className="font-royal text-xs font-bold uppercase tracking-wider text-white">
                    1v1 Multiplayer Colosseum
                  </span>
                  <span className="text-[11px] text-zinc-400 font-sans">
                    Challenge friends and matchmake in real-time speed battles.
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Primary Action Button: Professional, Royal, Sharp */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAction}
              className="w-full group relative flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 bg-[length:200%_auto] hover:bg-right text-slate-950 font-royal font-black text-xs sm:text-sm tracking-[0.14em] uppercase transition-all duration-300 shadow-[0_0_35px_rgba(6,182,212,0.45),inset_0_1px_2px_rgba(255,255,255,0.85)] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950/20" />
              <span>CLAIM YOUR STATS & UNLOCK FULL ACCESS</span>
              <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            {/* Keyboard return hint (requested by user: Backspace returns to practice) */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="mt-3.5 w-full flex items-center justify-center gap-2 text-[11px] font-royal font-bold uppercase tracking-[0.12em] text-zinc-400 hover:text-white transition-colors cursor-pointer py-1.5 px-3 rounded-xl hover:bg-zinc-900/60 border border-transparent hover:border-zinc-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Practice</span>
                <span className="text-zinc-600">•</span>
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800/90 border border-zinc-700/80 font-mono text-[10px] text-zinc-300">
                  ⌫ Backspace
                </kbd>
                <span className="text-zinc-500 text-[10px]">or</span>
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800/90 border border-zinc-700/80 font-mono text-[10px] text-zinc-300">
                  Esc
                </kbd>
              </button>
            )}

            {/* Footer reassurance */}
            <div className="mt-2.5 flex items-center justify-center gap-3 text-[11px] text-zinc-400 text-center">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Google 1-Click Sign-In
              </span>
              <span>•</span>
              <span>Takes 5 seconds</span>
              <span>•</span>
              <span>100% Free Forever</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}
