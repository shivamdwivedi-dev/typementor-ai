import React, { useState, useEffect, useRef } from 'react';
import { Swords, Clock, Wifi, WifiOff } from 'lucide-react';
import { PublicArenaMatch } from '../../types/arena';
import { arenaSocket } from '../../utils/arenaSocket';

interface ArenaLiveMatchProps {
  match: PublicArenaMatch;
  currentUserId: string;
  opponentProgress: {
    userId: string;
    progressPercent: number;
    wpm: number;
    accuracy: number;
    charsTyped: number;
  } | null;
  opponentDisconnected: boolean;
  onFinishSubmitted: () => void;
}

export const ArenaLiveMatch: React.FC<ArenaLiveMatchProps> = ({
  match,
  currentUserId,
  opponentProgress,
  opponentDisconnected,
  onFinishSubmitted,
}) => {
  const passage = match.passageText || '';
  const [typedText, setTypedText] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(match.maxDuration || 120);
  const [hasFinished, setHasFinished] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const lastUpdateRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());

  const myParticipant = match.participants.find((p) => p.userId === currentUserId);
  const opponentParticipant = match.participants.find((p) => p.userId !== currentUserId);

  // Focus input automatically
  useEffect(() => {
    inputRef.current?.focus();
    const handleWindowClick = () => inputRef.current?.focus();
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live local metrics
  const elapsedMinutes = Math.max(0.01, (Date.now() - startTimeRef.current) / 60000);
  let correctChars = 0;
  for (let i = 0; i < typedText.length; i++) {
    if (i < passage.length && typedText[i] === passage[i]) {
      correctChars++;
    }
  }

  const localWpm = Math.max(0, Math.round(((correctChars / 5) / elapsedMinutes) * 10) / 10);
  const localAccuracy = typedText.length > 0
    ? Math.min(100, Math.round((correctChars / typedText.length) * 100))
    : 100;
  const localProgress = passage.length > 0
    ? Math.min(100, Math.round((typedText.length / passage.length) * 100))
    : 0;

  // Auto-submit on timeout when timer hits 0 to prevent permanent match lockup
  useEffect(() => {
    if (secondsRemaining === 0 && !hasFinished) {
      setHasFinished(true);
      arenaSocket.send('SUBMIT_COMPLETION', {
        matchId: match.id,
        submittedText: typedText,
        metrics: {
          wpm: localWpm,
          accuracy: localAccuracy,
          progress: localProgress,
          elapsedSeconds: Math.round((Date.now() - startTimeRef.current) / 1000),
        },
      });
    }
  }, [secondsRemaining, hasFinished, match.id, typedText, localWpm, localAccuracy, localProgress]);

  // Handle keystroke typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (hasFinished) return;

    const val = e.target.value;
    if (val.length > passage.length) return; // Prevent typing beyond passage

    setTypedText(val);

    // Throttled progress update to server & opponent
    const now = Date.now();
    if (now - lastUpdateRef.current > 150) {
      lastUpdateRef.current = now;
      arenaSocket.send('PROGRESS_UPDATE', {
        matchId: match.id,
        charsTyped: val.length,
      });
    }

    // Check completion
    if (val.length >= passage.length && !hasFinished) {
      setHasFinished(true);
      arenaSocket.send('SUBMIT_COMPLETION', {
        matchId: match.id,
        submittedText: val,
      });
      onFinishSubmitted();
    }
  };

  const oppProgressPercent = opponentProgress?.progressPercent ?? opponentParticipant?.progressPercent ?? 0;
  const oppWpm = opponentProgress?.wpm ?? opponentParticipant?.wpm ?? 0;
  const oppAccuracy = opponentProgress?.accuracy ?? opponentParticipant?.accuracy ?? 100;

  // High-performance passage rendering: groups correct text and collapses untyped remainder into 1 span with Monkeytype aesthetics
  const renderedPassage = React.useMemo(() => {
    if (!passage) return null;
    const typedLen = typedText.length;
    const elements: React.ReactNode[] = [];
    let currentCorrectRun = '';

    for (let i = 0; i < typedLen; i++) {
      const char = passage[i] || '';
      const typed = typedText[i];
      if (typed === char) {
        currentCorrectRun += char;
      } else {
        if (currentCorrectRun) {
          elements.push(
            <span key={`c-${i - currentCorrectRun.length}`} className="text-slate-100 font-medium">
              {currentCorrectRun}
            </span>
          );
          currentCorrectRun = '';
        }
        elements.push(
          <span key={`e-${i}`} className="text-rose-400 font-bold bg-rose-500/25 rounded px-0.5">
            {char === ' ' ? '␣' : char}
          </span>
        );
      }
    }

    if (currentCorrectRun) {
      elements.push(
        <span key="c-end" className="text-slate-100 font-medium">
          {currentCorrectRun}
        </span>
      );
    }

    if (typedLen < passage.length) {
      const cursorChar = passage[typedLen];
      elements.push(
        <span
          key="cursor"
          className="relative inline-block text-cyan-300 font-bold"
        >
          <span className="absolute -left-[1.5px] top-1 bottom-1 w-[3px] bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.9),0_0_4px_rgba(34,211,238,1)] animate-pulse pointer-events-none" />
          {cursorChar === ' ' ? ' ' : cursorChar}
        </span>
      );
    }

    if (typedLen + 1 < passage.length) {
      const remainder = passage.slice(typedLen + 1);
      elements.push(
        <span key="remainder" className="text-slate-500">
          {remainder}
        </span>
      );
    }

    return elements;
  }, [passage, typedText]);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
      {/* Live Match Top Status Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{match.passageTitle}</h2>
            <p className="text-[11px] text-zinc-400">{passage.length} characters • {match.passageWordCount} words</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="font-mono text-sm font-bold text-white">
              {Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {opponentDisconnected ? (
              <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20 animate-pulse font-bold">
                <WifiOff className="w-3.5 h-3.5" /> Opponent Reconnecting...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 font-bold">
                <Wifi className="w-3.5 h-3.5" /> Live Synced
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Head-to-Head Real-Time Race Tracks */}
      <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-md space-y-6 shadow-2xl">
        {/* Opponent Track (Top) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-zinc-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>{opponentParticipant?.name || 'Opponent'}</span>
            </span>
            <div className="flex items-center gap-3 font-mono text-zinc-400">
              <span>{oppWpm} WPM</span>
              <span>{oppAccuracy}% ACC</span>
              <span className="text-white font-bold">{oppProgressPercent}%</span>
            </div>
          </div>
          <div className="relative h-4 w-full bg-zinc-950/80 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-[width] duration-150 ease-out rounded-full shadow-[0_0_10px_rgba(99,102,241,0.4)] will-change-[width]"
              style={{ width: `${oppProgressPercent}%` }}
            />
          </div>
        </div>

        {/* You Track (Bottom) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-blue-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span>You ({myParticipant?.name || 'You'})</span>
            </span>
            <div className="flex items-center gap-3 font-mono text-zinc-300">
              <span className="text-amber-400">{localWpm} WPM</span>
              <span className="text-emerald-400">{localAccuracy}% ACC</span>
              <span className="text-white font-bold">{localProgress}%</span>
            </div>
          </div>
          <div className="relative h-4 w-full bg-zinc-950/80 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-[width] duration-150 ease-out rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] will-change-[width]"
              style={{ width: `${localProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Target Passage Interactive Reader Box */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl relative cursor-text select-none min-h-[160px] focus-within:border-cyan-500/50 transition-colors"
      >
        <p className="font-mono text-xl sm:text-2xl md:text-[28px] leading-[1.85] sm:leading-[1.95] tracking-wide whitespace-pre-wrap break-words [word-break:normal] [overflow-wrap:break-word]">
          {renderedPassage}
        </p>

        {typedText.length === 0 && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-zinc-800/80 text-xs font-mono text-cyan-400/80 animate-pulse">
            <span>Type to race • maintain steady rhythm for maximum WPM</span>
          </div>
        )}

        {/* Hidden active typing input */}
        <input
          ref={inputRef}
          type="text"
          value={typedText}
          onChange={handleInputChange}
          className="absolute opacity-0 pointer-events-none inset-0"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />

        {hasFinished && (
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center gap-2 animate-in fade-in">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-emerald-400">
              Passage Completed! Finalizing match settlement...
            </p>
          </div>
        )}
      </div>

      {/* Responsive Keyboard Helper Pill */}
      <div className="text-center">
        <p className="text-xs text-zinc-500">
          Click anywhere in the box or simply start typing. Keep cadence smooth for maximum WPM.
        </p>
      </div>
    </div>
  );
};
