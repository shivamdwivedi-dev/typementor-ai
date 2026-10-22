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
              className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-300 ease-out rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
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
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-150 ease-out rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]"
              style={{ width: `${localProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Target Passage Interactive Reader Box */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl relative cursor-text select-none min-h-[160px]"
      >
        <p className="font-mono text-lg sm:text-xl leading-relaxed tracking-wide">
          {passage.split('').map((char, index) => {
            let color = 'text-zinc-600';
            let bg = '';

            if (index < typedText.length) {
              if (typedText[index] === char) {
                color = 'text-emerald-400 font-medium';
              } else {
                color = 'text-red-400 font-bold';
                bg = 'bg-red-500/20 rounded';
              }
            } else if (index === typedText.length) {
              color = 'text-white font-bold underline decoration-blue-500 decoration-2 underline-offset-4';
              bg = 'bg-blue-500/20 rounded';
            }

            return (
              <span key={index} className={`${color} ${bg}`}>
                {char}
              </span>
            );
          })}
        </p>

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
