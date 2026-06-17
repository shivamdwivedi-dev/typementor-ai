import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTypingStore } from '../store/TypingStore';
import { Play, RotateCcw, ShieldAlert, Timer } from 'lucide-react';
import SessionResults from './SessionResults';
import { soundEngine } from '../utils/soundEngine';
import { useAICoachPulse, AICoachPulseCard } from '../utils/aiCoachPulse';

interface TypingEngineProps {
  onSessionComplete?: (metrics: {
    wpm: number;
    rawWpm: number;
    accuracy: number;
    consistency: number;
    focusScore: number;
    backspaceCount: number;
    correctionCount: number;
    keystrokes: any[];
  }) => void;
  // Called when user clicks "Next Lesson" in the results screen
  onStartNext?: () => void;
  // Called when user clicks "View Dashboard" in the results screen
  onViewDashboard?: () => void;
  onStartRecoveryPractice?: () => void;
  onNavigateToAcademy?: () => void;
}

// ─── Memoized single character span ───────────────────────────────────────────
interface CharSpanProps {
  char: string;
  charClass: string;
  showCaret: boolean;
}

const CharSpan = React.memo(({ char, charClass, showCaret }: CharSpanProps) => (
  <span className={`relative rounded px-[1px] ${charClass}`}>
    {char === ' ' ? '␣' : char}
    {showCaret && (
      <span className="absolute left-0 bottom-0 top-0 w-[2.5px] bg-brand-primary animate-blink rounded" />
    )}
  </span>
));
CharSpan.displayName = 'CharSpan';

// ─── Memoized text board ───────────────────────────────────────────────────────
interface TextBoardProps {
  words: string;
  currentIndex: number;
  keystrokesSnapshot: { isMistake: boolean }[];
}

const TextBoard = React.memo(({ words, currentIndex, keystrokesSnapshot }: TextBoardProps) => {
  return (
    <div className="text-xl md:text-2xl leading-relaxed tracking-wide font-mono select-none break-all flex flex-wrap gap-y-2">
      {words.split('').map((char, index) => {
        let charClass = 'text-brand-muted';

        if (index < currentIndex) {
          const keyLog = keystrokesSnapshot[index];
          charClass = keyLog && !keyLog.isMistake
            ? 'text-brand-success font-semibold border-b-2 border-brand-success/30'
            : 'text-brand-danger font-semibold bg-brand-danger/10 border-b-2 border-brand-danger/30';
        } else if (index === currentIndex) {
          charClass = 'text-white bg-brand-primary/20 font-bold';
        }

        return (
          <CharSpan
            key={index}
            char={char}
            charClass={charClass}
            showCaret={index === currentIndex}
          />
        );
      })}
    </div>
  );
});
TextBoard.displayName = 'TextBoard';

// ─── Main component ────────────────────────────────────────────────────────────
export default function TypingEngine({
  onSessionComplete,
  onStartNext,
  onViewDashboard,
  onStartRecoveryPractice,
  onNavigateToAcademy,
}: TypingEngineProps) {
  const {
    words,
    currentIndex,
    keystrokes,
    backspaceCount,
    correctionCount,
    isActive,
    isCompleted,
    wpm,
    rawWpm,
    accuracy,
    consistency,
    focusScore,
    mode,
    difficulty,
    initializeSession,
    startSession,
    recordKeystroke,
    handleBackspace,
    pauseSession,
    resumeSession,
  } = useTypingStore();

  const [cheatDetected, setCheatDetected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // AI Coach Pulse Hook integration
  const { pulseMessage, processPulse, clearPulse, resetSessionState } = useAICoachPulse();

  // Inactivity auto-pause logic
  useEffect(() => {
    if (!isActive || isCompleted || isPaused) return;

    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsPaused(true);
        pauseSession();
      }, 10000); // 10s idle threshold
    };

    const handleWindowBlur = () => {
      setIsPaused(true);
      pauseSession();
    };

    const activityEvents = ['keydown', 'mousedown', 'mousemove', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetIdleTimer));
    window.addEventListener('blur', handleWindowBlur);

    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetIdleTimer));
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isActive, isCompleted, isPaused, pauseSession]);

  const handleResume = () => {
    setIsPaused(false);
    resumeSession();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Reset coaching stats when words (session context) change
  useEffect(() => {
    resetSessionState();
  }, [words]);

  // Feed metrics to coaching processor reactively
  useEffect(() => {
    if (isCompleted || !isActive) return;

    const typedChars = keystrokes.map(k => ({
      expected: k.expectedKey,
      actual: k.actualKey,
      isMistake: k.isMistake,
      timestamp: k.timestamp
    }));

    const backspaces = useTypingStore.getState().backspaceHistory.map(b => ({
      timestamp: b.timestamp,
      isAfterMistake: b.isAfterMistake
    }));

    processPulse({
      typedChars,
      backspaces,
      wpm,
      accuracy,
      isCompleted
    });
  }, [keystrokes.length, backspaceCount, isCompleted, isActive]);

  // Snapshot only isMistake per keystroke — avoids passing full objects to TextBoard
  const keystrokesSnapshot = useMemo(
    () => keystrokes.map(k => ({ isMistake: k.isMistake })),
    [keystrokes.length, currentIndex]
  );

  const focusInput = useCallback(() => {
    if (inputRef.current && !isCompleted && !cheatDetected) {
      inputRef.current.focus();
    }
  }, [isCompleted, cheatDetected]);

  useEffect(() => {
    focusInput();
  }, [words, isCompleted]);

  // Fire onSessionComplete callback when session ends
  useEffect(() => {
    if (isCompleted && onSessionComplete) {
      onSessionComplete({
        wpm,
        rawWpm,
        accuracy,
        consistency,
        focusScore,
        backspaceCount,
        correctionCount,
        keystrokes,
      });
    }
  }, [isCompleted]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isCompleted || cheatDetected || isPaused) return;

    if (!isActive) startSession();

    const key = e.key;

    if (key === 'Backspace') {
      e.preventDefault();
      handleBackspace();
      soundEngine.play('backspace');
      return;
    }

    if (key.length > 1 && key !== ' ') return;

    e.preventDefault();

    const expectedChar = words[currentIndex];
    const isMistake = expectedChar !== key;

    // Anti-cheat: flag bot-speed inputs
    if (keystrokes.length > 5) {
      const recentTimes = keystrokes.slice(-5).map(k => k.reactionTime);
      const avg = recentTimes.reduce((a, b) => a + b, 0) / 5;
      if (avg < 5) {
        setCheatDetected(true);
        return;
      }
    }

    const currentWordIndex = words.slice(0, currentIndex).split(' ').length - 1;

    recordKeystroke({
      expectedKey: expectedChar,
      actualKey: key,
      timestamp: Date.now(),
      wordIndex: currentWordIndex,
      holdTime: 80,
      isMistake,
    });

    if (key === ' ') {
      soundEngine.play('space');
    } else if (key === 'Enter') {
      soundEngine.play('enter');
    } else {
      soundEngine.play('key');
    }
  }, [isCompleted, cheatDetected, isActive, words, currentIndex, keystrokes, startSession, handleBackspace, recordKeystroke]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    setCheatDetected(true);
  }, []);

  // Retry = restart the exact same text
  const handleRetry = useCallback(() => {
    setCheatDetected(false);
    setIsPaused(false);
    const state = useTypingStore.getState();
    initializeSession(state.words, state.mode, state.difficulty, state.riskKeys);
    setTimeout(focusInput, 50);
  }, [initializeSession, focusInput]);

  // Next = App.tsx decides what text comes next
  const handleNext = useCallback(() => {
    setCheatDetected(false);
    setIsPaused(false);
    if (onStartNext) onStartNext();
    setTimeout(focusInput, 50);
  }, [onStartNext, focusInput]);

  // Dashboard
  const handleDashboard = useCallback(() => {
    if (onViewDashboard) onViewDashboard();
  }, [onViewDashboard]);

  // Reset button in the header (mid-session restart)
  const handleReset = useCallback(() => {
    setCheatDetected(false);
    setIsPaused(false);
    const state = useTypingStore.getState();
    initializeSession(state.words, state.mode, state.difficulty, state.riskKeys);
    setTimeout(focusInput, 50);
  }, [initializeSession, focusInput]);

  // ── If session is complete → show full results screen ────────────────────────
  if (isCompleted && !cheatDetected) {
    return (
      <SessionResults
        wpm={wpm}
        rawWpm={rawWpm}
        accuracy={accuracy}
        consistency={consistency}
        focusScore={focusScore}
        backspaceCount={backspaceCount}
        correctionCount={correctionCount}
        keystrokes={keystrokes}
        mode={mode}
        difficulty={difficulty}
        onNext={handleNext}
        onRetry={handleRetry}
        onDashboard={handleDashboard}
        onStartRecoveryPractice={onStartRecoveryPractice}
        onNavigateToAcademy={onNavigateToAcademy}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto relative" onClick={focusInput}>
      {/* Live Metrics Header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl border border-brand-border/40 text-center relative overflow-hidden">
          <div className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">
            WPM
          </div>
          <div className="text-2xl font-black text-brand-primary font-mono">{wpm}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-brand-border/40 text-center">
          <div className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">
            Accuracy
          </div>
          <div className="text-2xl font-black text-brand-success font-mono">{accuracy}%</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-brand-border/40 text-center">
          <div className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">
            Mode
          </div>
          <div className="text-sm font-black text-white mt-1.5 truncate uppercase tracking-wide">
            {mode}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-brand-border/40 text-center">
          <div className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">
            Mistakes
          </div>
          <div className="text-2xl font-black text-brand-danger font-mono">
            {keystrokes.filter(k => k.isMistake).length}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-brand-border/40 flex items-center justify-center gap-3 col-span-2 md:col-span-1">
          <button
            onClick={handleReset}
            className="flex-1 md:flex-none p-2.5 rounded-lg border border-brand-border/40 hover:bg-brand-card/45 hover:border-brand-primary/50 text-brand-muted hover:text-white transition-all focus:outline-none"
            title="Restart Session"
          >
            <RotateCcw className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </div>

      {/* Typing Board Panel */}
      <div
        onClick={() => {
          if (isPaused) {
            handleResume();
          } else {
            inputRef.current?.focus();
          }
        }}
        className="glass-panel p-6 md:p-8 rounded-2xl border border-brand-border/40 mb-4 relative min-h-[160px] flex items-center cursor-text"
      >
        {isPaused && (
          <div
            className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-200 cursor-pointer rounded-2xl"
            onClick={(e) => {
              e.stopPropagation();
              handleResume();
            }}
          >
            <div className="bg-brand-card/90 border border-brand-border/80 p-6 rounded-2xl text-center max-w-sm mx-4 space-y-4 shadow-2xl">
              <div className="inline-flex p-3 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary animate-pulse">
                <Timer className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">Practice Paused</h4>
                <p className="text-[11px] text-brand-muted mt-1 leading-relaxed">
                  You have been inactive. Click or touch anywhere to resume typing.
                </p>
              </div>
              <button className="w-full py-2 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold rounded-xl text-xs transition-all shadow-md">
                Resume
              </button>
            </div>
          </div>
        )}
        {cheatDetected ? (
          <div className="w-full text-center space-y-3">
            <ShieldAlert className="w-12 h-12 text-brand-danger mx-auto animate-bounce" />
            <h3 className="text-lg font-black text-white">Bot/Input Manipulation Flagged</h3>
            <p className="text-xs text-brand-muted max-w-sm mx-auto">
              Bot actions, clipboard pasting, or speed manipulation is disabled to ensure honest metric analytics.
            </p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-brand-danger hover:bg-brand-danger/90 text-white font-bold text-xs rounded-xl"
            >
              Reset Session
            </button>
          </div>
        ) : (
          <div className="w-full text-left">
            <textarea
              ref={inputRef}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className="absolute opacity-0 pointer-events-none"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {/* Memoized text render — only re-renders changed chars */}
            <TextBoard
              words={words}
              currentIndex={currentIndex}
              keystrokesSnapshot={keystrokesSnapshot}
            />
          </div>
        )}

        {/* Focus overlay */}
        {!isActive && !isCompleted && !cheatDetected && (
          <div className="absolute inset-0 bg-brand-card/45 backdrop-blur-[2px] flex items-center justify-center transition-all cursor-pointer pointer-events-none">
            <div className="bg-brand-bg/85 border border-brand-border px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-primary animate-pulse">
              <Play className="w-4 h-4" />
              Click inside to start typing
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-brand-muted px-2">
        <p>Telemetry Speed tracking is calculated per minute based on characters typed.</p>
        <p>Active key length: {words.length} chars</p>
      </div>

      {/* Coach Pulse notification popup */}
      {pulseMessage && (
        <AICoachPulseCard
          message={pulseMessage}
          onClose={clearPulse}
        />
      )}
    </div>
  );
}
