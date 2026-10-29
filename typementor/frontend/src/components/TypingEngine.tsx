import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTypingStore } from '../store/TypingStore';
import { Play, RotateCcw, ShieldAlert, Timer, SlidersHorizontal, Sparkles } from 'lucide-react';
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
  isZenMode?: boolean;
  onToggleZen?: () => void;
}

// ─── Memoized single character span ───────────────────────────────────────────
interface CharSpanProps {
  char: string;
  charClass: string;
  showCaret: boolean;
}

const CharSpan = React.memo(({ char, charClass, showCaret }: CharSpanProps) => {
  const isSpace = char === ' ';
  const isMistake = charClass.includes('text-rose-400') || charClass.includes('text-brand-danger');

  return (
    <span
      data-caret={showCaret ? 'true' : undefined}
      className={`relative rounded px-[1px] transition-colors duration-75 ${charClass}`}
    >
      {char === '\n' ? (
        <>
          <span className="text-slate-600/70 text-xs select-none">↵</span>
          <br />
        </>
      ) : isSpace ? (
        isMistake ? (
          <span className="text-rose-400 bg-rose-500/25 rounded px-0.5 font-bold">␣</span>
        ) : (
          ' '
        )
      ) : (
        char
      )}
      {showCaret && (
        <span
          className="absolute -left-[1.5px] top-[10%] bottom-[10%] w-[3px] bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.9),0_0_4px_rgba(34,211,238,1)] animate-pulse pointer-events-none"
          style={{ willChange: 'opacity' }}
        />
      )}
    </span>
  );
});
CharSpan.displayName = 'CharSpan';

// ─── Memoized token component ─────────────────────────────────────────────────
interface TokenItemProps {
  token: string;
  start: number;
  end: number;
  currentIndex: number;
  keystrokes: { isMistake: boolean }[];
}

const TokenItem = React.memo(({ token, start, currentIndex, keystrokes }: TokenItemProps) => {
  const isWhitespace = /^\s+$/.test(token);

  // Pending token: user hasn't reached it yet
  if (currentIndex < start) {
    return (
      <span className={`${isWhitespace ? 'inline' : 'inline-block'} whitespace-pre-wrap text-slate-500 font-normal select-none`}>
        {token}
      </span>
    );
  }

  // Active or Completed token: render character-by-character
  return (
    <span className={`${isWhitespace ? 'inline' : 'inline-block'} whitespace-pre-wrap`}>
      {token.split('').map((char, offset) => {
        const index = start + offset;
        let charClass = 'text-slate-500 font-normal';

        if (index < currentIndex) {
          const keyLog = keystrokes[index];
          charClass = keyLog && !keyLog.isMistake
            ? 'text-slate-100 font-medium'
            : 'text-rose-400 font-semibold bg-rose-500/15 border-b-2 border-rose-500/60 rounded';
        } else if (index === currentIndex) {
          charClass = 'text-white bg-cyan-500/15 font-semibold rounded';
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
    </span>
  );
}, (prev, next) => {
  if (prev.token !== next.token || prev.start !== next.start || prev.end !== next.end) {
    return false;
  }
  const wasPending = prev.currentIndex < prev.start;
  const isPending = next.currentIndex < next.start;
  if (wasPending && isPending) return true;

  const wasCompleted = prev.currentIndex >= prev.end;
  const isCompleted = next.currentIndex >= next.end;
  if (wasCompleted && isCompleted) return true;

  return false;
});
TokenItem.displayName = 'TokenItem';

// ─── Memoized text board ───────────────────────────────────────────────────────
interface TextBoardProps {
  words: string;
  currentIndex: number;
  keystrokes: { isMistake: boolean }[];
  isZenMode?: boolean;
}

const TextBoard = React.memo(({ words, currentIndex, keystrokes, isZenMode }: TextBoardProps) => {
  const parsedTokens = useMemo(() => {
    const matches = words.match(/\S+|\s+/g) ?? [];
    let offset = 0;
    return matches.map((token, tokenIndex) => {
      const start = offset;
      offset += token.length;
      return { token, tokenIndex, start, end: offset };
    });
  }, [words]);

  return (
    <div
      className={`font-mono tracking-wide select-none break-words whitespace-pre-wrap [word-break:normal] [overflow-wrap:break-word] transition-all duration-200 ${
        isZenMode
          ? 'text-2xl sm:text-3xl md:text-[36px] leading-[1.8] sm:leading-[1.9] md:leading-[2.05]'
          : 'text-xl sm:text-2xl md:text-[32px] leading-[1.85] sm:leading-[1.95] md:leading-[2.05]'
      }`}
    >
      {parsedTokens.map((t) => (
        <TokenItem
          key={`${t.start}-${t.tokenIndex}`}
          token={t.token}
          start={t.start}
          end={t.end}
          currentIndex={currentIndex}
          keystrokes={keystrokes}
        />
      ))}
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
  isZenMode = false,
  onToggleZen,
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
  const [hudStyle, setHudStyle] = useState<'minimal' | 'cards'>(() => {
    return (localStorage.getItem('typementor_hud_style') as 'minimal' | 'cards') || 'minimal';
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Automated Smooth Viewport Caret Tracking
  // Automatically scrolls the typing container and browser viewport as the user advances through lines,
  // ensuring upcoming words and paragraphs are always smoothly visible ahead without manual scrolling.
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;

    // Reset scroll when rewound to start or starting a new session
    if (currentIndex === 0) {
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      } else {
        container.scrollTop = 0;
      }
      return;
    }

    const caretEl = container.querySelector('[data-caret="true"]') as HTMLElement | null;
    if (!caretEl) return;

    const containerRect = container.getBoundingClientRect();
    const caretRect = caretEl.getBoundingClientRect();

    if (!caretRect.height) return;

    // Relative vertical position inside the scrollable container content
    const caretRelativeTop = caretRect.top - containerRect.top + container.scrollTop;
    const lineHeight = caretRect.height || 48;

    // Maintain active caret at ~line 2 (1.2x to 1.4x lineHeight from top of container).
    // This provides 1 line of preceding context and 2-3 lines of upcoming preview text.
    const targetScrollTop = Math.max(0, caretRelativeTop - lineHeight * 1.3);

    // Only scroll when crossing a line boundary (diff > 12px) to prevent micro-jitter across characters
    if (Math.abs(targetScrollTop - container.scrollTop) > 12) {
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth',
        });
      } else {
        container.scrollTop = targetScrollTop;
      }
    }

    // Viewport auto-scroll: if active typing area is near or below the screen bottom
    if (!isZenMode && typeof window !== 'undefined') {
      const windowHeight = window.innerHeight;
      const caretScreenBottom = caretRect.bottom;
      const caretScreenTop = caretRect.top;

      if (caretScreenBottom > windowHeight - 120 && typeof window.scrollBy === 'function') {
        window.scrollBy({
          top: caretScreenBottom - (windowHeight * 0.45),
          behavior: 'smooth',
        });
      } else if (caretScreenTop < 100 && window.scrollY > 0 && typeof window.scrollBy === 'function') {
        window.scrollBy({
          top: caretScreenTop - 160,
          behavior: 'smooth',
        });
      }
    }
  }, [currentIndex, words, isZenMode]);

  const toggleHudStyle = useCallback(() => {
    setHudStyle(prev => {
      const next = prev === 'minimal' ? 'cards' : 'minimal';
      localStorage.setItem('typementor_hud_style', next);
      return next;
    });
  }, []);

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

  const lastPulseCheckRef = useRef<number>(0);

  // Feed metrics to coaching processor reactively (throttled to avoid keystroke micro-stutter)
  useEffect(() => {
    if (isCompleted || !isActive) return;

    const now = Date.now();
    // Throttle checks to once every 1200ms unless completing, saving massive CPU cycles
    if (now - lastPulseCheckRef.current < 1200 && !isCompleted) {
      return;
    }
    lastPulseCheckRef.current = now;

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

  // Mid-session reset / restart
  const handleReset = useCallback(() => {
    setCheatDetected(false);
    setIsPaused(false);
    const state = useTypingStore.getState();
    initializeSession(state.words, state.mode, state.difficulty, state.riskKeys);
    setTimeout(focusInput, 50);
  }, [initializeSession, focusInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isCompleted || cheatDetected || isPaused) return;

    // Hotkey: Tab (unless typing a tab character) or Escape instantly restarts session
    if ((e.key === 'Tab' && words[currentIndex] !== '\t') || e.key === 'Escape') {
      e.preventDefault();
      handleReset();
      return;
    }

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
  }, [isCompleted, cheatDetected, isPaused, words, currentIndex, handleReset, isActive, startSession, handleBackspace, keystrokes, recordKeystroke]);

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

  // Next = App decides what text comes next
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

  const mistakesCount = keystrokes.filter(k => k.isMistake).length;

  return (
    <div className={`w-full mx-auto relative ${isZenMode ? 'max-w-6xl' : 'max-w-5xl'}`} onClick={focusInput}>
      {/* ── Live Metrics Header ── */}
      {hudStyle === 'minimal' || isZenMode ? (
        <div
          className={`flex items-center justify-between gap-4 mb-6 px-4 py-3 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-md transition-opacity duration-300 ${
            isZenMode && isActive && !isPaused ? 'opacity-25 hover:opacity-100' : 'opacity-100'
          }`}
        >
          {/* Left: Mode tag & Difficulty */}
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-extrabold text-[11px] tracking-wider uppercase">
              {mode}
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Tier {difficulty}
            </span>
          </div>

          {/* Center: Live Numbers */}
          <div className="flex items-center gap-6 sm:gap-10 font-mono">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono tracking-tight">{wpm}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">wpm</span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">{accuracy}%</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">acc</span>
            </div>

            <div className="flex items-baseline gap-1.5 hidden xs:flex">
              <span className="text-2xl sm:text-3xl font-black text-rose-400 font-mono tracking-tight">
                {mistakesCount}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">miss</span>
            </div>

            <div className="hidden md:flex items-baseline gap-1.5 text-slate-400">
              <span className="text-sm font-semibold">{currentIndex}/{words.length}</span>
              <span className="text-[10px] uppercase font-bold text-slate-500">chars</span>
            </div>
          </div>

          {/* Right: Restart & Options */}
          <div className="flex items-center gap-2">
            {!isZenMode && (
              <button
                type="button"
                onClick={toggleHudStyle}
                className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-xs"
                title="Switch to Card HUD"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            )}
            {onToggleZen && (
              <button
                type="button"
                onClick={onToggleZen}
                className={`p-2 rounded-lg border transition-all text-xs ${
                  isZenMode
                    ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400'
                }`}
                title={isZenMode ? "Exit Zen Focus Mode (Esc)" : "⚡ Zen Focus Mode"}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold"
              title="Restart Test (Tab or Esc)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] text-slate-400 font-mono">Tab</span>
            </button>
          </div>
        </div>
      ) : (
        /* Traditional 5-card HUD */
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
              {mistakesCount}
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-brand-border/40 flex items-center justify-center gap-2 col-span-2 md:col-span-1">
            <button
              onClick={toggleHudStyle}
              className="p-2.5 rounded-lg border border-brand-border/40 hover:bg-brand-card/45 hover:border-brand-primary/50 text-brand-muted hover:text-white transition-all"
              title="Switch to Minimal Monkeytype HUD"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-2.5 rounded-lg border border-brand-border/40 hover:bg-brand-card/45 hover:border-brand-primary/50 text-brand-muted hover:text-white transition-all"
              title="Restart Session (Tab or Esc)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Typing Board Panel ── */}
      <div
        onClick={() => {
          if (isPaused) {
            handleResume();
          } else {
            inputRef.current?.focus();
          }
        }}
        className={`p-6 sm:p-8 md:p-12 rounded-3xl border transition-all duration-300 relative min-h-[220px] md:min-h-[260px] flex items-center cursor-text ${
          isZenMode
            ? 'bg-slate-950/70 border-slate-800/80 shadow-[0_16px_50px_rgba(0,0,0,0.5)]'
            : 'glass-panel border-brand-border/40 shadow-2xl'
        } focus-within:border-cyan-500/40 focus-within:shadow-[0_0_30px_rgba(6,182,212,0.12)]`}
      >
        {isPaused && (
          <div
            className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-200 cursor-pointer rounded-3xl"
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

            {/* Scrollable Viewport with Automated Caret Tracking */}
            <div
              ref={scrollContainerRef}
              className={`w-full overflow-y-auto no-scrollbar relative transition-all duration-200 py-1 ${
                isZenMode
                  ? 'max-h-[220px] sm:max-h-[270px] md:max-h-[330px]'
                  : 'max-h-[180px] sm:max-h-[220px] md:max-h-[270px]'
              }`}
            >
              {/* Memoized text render — token-level virtualization for 120 FPS */}
              <TextBoard
                words={words}
                currentIndex={currentIndex}
                keystrokes={keystrokes}
                isZenMode={isZenMode}
              />
            </div>
          </div>
        )}

        {/* Clean, Non-intrusive Start Indicator */}
        {!isActive && !isCompleted && !cheatDetected && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none transition-all">
            <div className="bg-slate-900/90 border border-cyan-500/30 px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-[11px] font-semibold text-cyan-300 backdrop-blur-md animate-pulse">
              <Play className="w-3 h-3 text-cyan-400" />
              <span>Press any key to start typing</span>
            </div>
          </div>
        )}
      </div>

      {/* Subtle Bottom Helper Hint */}
      <div
        className={`flex items-center justify-between text-xs text-slate-500 px-3 mt-3 transition-opacity duration-300 ${
          isZenMode && isActive && !isPaused ? 'opacity-20 hover:opacity-100' : 'opacity-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 font-mono text-[10px] text-slate-300">Tab</kbd>
            <span>or</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 font-mono text-[10px] text-slate-300">Esc</kbd>
            <span className="text-[11px] text-slate-400">restart</span>
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="hidden sm:inline text-[11px] text-slate-400">120 FPS Keystroke Telemetry</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          {words.length} chars
        </div>
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
