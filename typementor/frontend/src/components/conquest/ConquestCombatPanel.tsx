import React, { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Target,
  AlertCircle,
  Send,
  Swords,
  Info,
} from 'lucide-react';
import { ActiveAttackChallenge } from '../../types/conquest';
import { useAutomatedCaretScroll } from '../../utils/useAutomatedCaretScroll';

interface ConquestCombatPanelProps {
  challenge: ActiveAttackChallenge;
  onSubmit: (submittedText: string) => void;
  onProgress: (charsTyped: number) => void;
  errorReason?: string | null;
}

export const ConquestCombatPanel: React.FC<ConquestCombatPanelProps> = ({
  challenge,
  onSubmit,
  onProgress,
  errorReason,
}) => {
  const [typedText, setTypedText] = useState('');
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() =>
    Math.max(0, challenge.deadlineAt - Date.now())
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFocused, setIsFocused] = useState(true);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastProgressSentRef = useRef<number>(0);

  const expectedText = challenge.passageText.replace(/\r\n/g, '\n');

  // Advanced multi-device automated caret tracking & smooth viewport scroll
  const {
    containerRef: combatScrollRef,
    maskStyle,
  } = useAutomatedCaretScroll({
    activeCharIndex: typedText.length,
    totalLength: expectedText.length,
    enableHorizontalScroll: true,
    enableViewportScroll: true,
    selector: '[data-caret="true"]',
  });

  // Focus input on mount and retain focus
  useEffect(() => {
    inputRef.current?.focus();
    (window as any).__conquestSubmitAttack = (text?: string) => {
      if (isSubmitted) return;
      setIsSubmitted(true);
      onSubmit(text ?? typedText);
    };
    (window as any).__conquestFocusInput = () => {
      inputRef.current?.focus();
      setIsFocused(true);
    };
    return () => {
      delete (window as any).__conquestSubmitAttack;
      delete (window as any).__conquestFocusInput;
    };
  }, [challenge.challengeId, onSubmit, typedText, isSubmitted]);

  // Keep input focused when clicking container
  const handleContainerClick = () => {
    inputRef.current?.focus();
    setIsFocused(true);
  };

  const typedTextRef = useRef(typedText);
  typedTextRef.current = typedText;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  // 75-second countdown timer interval (decoupled from keystroke changes)
  useEffect(() => {
    if (isSubmitted) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, challenge.deadlineAt - Date.now());
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        setIsSubmitted(true);
        onSubmitRef.current(typedTextRef.current);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [challenge.deadlineAt, isSubmitted]);

  // Handle typing input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isSubmitted) return;

    const val = e.target.value;
    // Don't allow typing beyond passage length + 10 chars
    if (val.length > expectedText.length + 10) return;

    setTypedText(val);

    // Throttle progress emissions to every 100ms
    const now = Date.now();
    if (now - lastProgressSentRef.current >= 100) {
      lastProgressSentRef.current = now;
      onProgress(val.length);
    }

    // Auto-submit when fully typed
    if (val.length >= expectedText.length) {
      setIsSubmitted(true);
      onSubmit(val);
    }
  };

  // Compute live character metrics for feedback
  let correctChars = 0;
  const compareLen = Math.min(typedText.length, expectedText.length);
  for (let i = 0; i < compareLen; i++) {
    if (typedText[i] === expectedText[i]) {
      correctChars++;
    }
  }

  const accuracy =
    typedText.length > 0 ? Math.round((correctChars / typedText.length) * 100) : 100;

  const elapsedMs = Math.max(10, Date.now() - challenge.startedAt);
  const elapsedMin = elapsedMs / 60000;
  const wpm = Math.round((correctChars / 5 / elapsedMin) * 10) / 10;

  const progressPercent = Math.min(100, Math.round((typedText.length / expectedText.length) * 100));
  const secondsLeft = Math.ceil(timeLeftMs / 1000);
  const timerPercent = Math.min(100, Math.max(0, (timeLeftMs / 75000) * 100));

  return (
    <div
      id="conquest-combat-panel"
      onClick={handleContainerClick}
      className="w-full max-w-3xl mx-auto rounded-3xl bg-zinc-950/95 border border-purple-500/40 p-5 sm:p-7 shadow-2xl backdrop-blur-2xl space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300 relative overflow-hidden"
    >
      {/* Background atmospheric glows */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Swords className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-purple-400 tracking-wider">
                Assault in Progress
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-800 text-zinc-300">
                Target: {challenge.targetCellKey}
              </span>
              {challenge.defenseModifier > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 border border-amber-500/30 text-amber-300">
                  +{challenge.defenseModifier} Defense Bonus
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {challenge.passageTitle}
            </h3>
          </div>
        </div>

        {/* Live Accuracy Requirement & Timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-400 font-medium">Req:</span>
            <span
              className={`font-mono font-bold ${
                accuracy >= challenge.minAccuracy ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {challenge.minAccuracy}%
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <Timer
              className={`w-4 h-4 ${
                secondsLeft <= 15 ? 'text-rose-400 animate-pulse' : 'text-purple-400'
              }`}
            />
            <span
              className={`font-mono font-black text-sm ${
                secondsLeft <= 15 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {secondsLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ease-linear ${
            secondsLeft <= 15 ? 'bg-rose-500' : 'bg-purple-500'
          }`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* Short self-explanatory instruction banner */}
      <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs text-zinc-300 gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            <strong className="text-white">Combat Rule:</strong> Type the passage exactly as
            displayed. Accuracy matters. Complete it before the countdown reaches zero.
          </span>
        </div>
        {/* Focus indicator badge */}
        <div
          className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
            isFocused
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isFocused ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
            }`}
          />
          <span>{isFocused ? 'Keyboard Active' : 'Click to Focus'}</span>
        </div>
      </div>

      {/* Error message banner (if previous submission failed) */}
      {errorReason && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorReason}</span>
        </div>
      )}

      {/* Passage Display Area with Active Typing Focus Indicator */}
      <div
        ref={combatScrollRef}
        style={maskStyle}
        data-testid="combat-passage"
        className={`relative p-6 rounded-2xl bg-zinc-900/80 border transition-all font-mono text-xl sm:text-2xl leading-[1.85] sm:leading-[1.95] tracking-wide select-none min-h-[160px] max-h-[260px] overflow-y-auto no-scrollbar cursor-text break-words whitespace-pre-wrap [word-break:normal] [overflow-wrap:break-word] ${
          isFocused
            ? 'border-purple-500/60 ring-2 ring-purple-500/20 shadow-inner'
            : 'border-amber-500/50 ring-1 ring-amber-500/20'
        }`}
      >
        {expectedText.split('').map((char, idx) => {
          let charClass = 'text-zinc-500';
          const isCurrent = idx === typedText.length;
          const isTyped = idx < typedText.length;
          const isMistake = isTyped && typedText[idx] !== char;

          if (isTyped) {
            if (!isMistake) {
              charClass = 'text-slate-100 font-medium';
            } else {
              charClass = 'text-rose-400 bg-rose-500/25 rounded px-0.5 font-bold';
            }
          } else if (isCurrent) {
            charClass = 'text-cyan-300 font-bold';
          }

          const displayChar = char === ' ' ? (isMistake ? '␣' : ' ') : char;

          return (
            <span
              key={idx}
              data-caret={isCurrent ? 'true' : undefined}
              className={`relative inline transition-colors duration-75 ${charClass}`}
            >
              {isCurrent && (
                <span className="absolute -left-[1.5px] top-1 bottom-1 w-[3px] bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.9),0_0_4px_rgba(34,211,238,1)] animate-pulse pointer-events-none" />
              )}
              {displayChar}
            </span>
          );
        })}
      </div>

      {/* Hidden autofocus typing input */}
      <textarea
        ref={inputRef}
        value={typedText}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={isSubmitted}
        rows={1}
        className="opacity-0 absolute -left-[9999px] top-0 pointer-events-none"
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        aria-label="Conquest challenge typing input"
      />

      {/* Live HUD, Outcome Hints & Submit Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
        {/* WPM & Accuracy Counters */}
        <div className="flex items-center gap-6 text-xs sm:text-sm">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
              Speed
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-white">{wpm}</span>
            <span className="text-zinc-400 text-xs ml-1 font-sans">wpm</span>
          </div>

          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
              Accuracy
            </span>
            <span
              className={`font-mono text-xl sm:text-2xl font-black ${
                accuracy >= challenge.minAccuracy ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {accuracy}%
            </span>
          </div>

          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
              Progress
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-purple-300">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Action Button & Outcome Explanation */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="text-[11px] text-zinc-400 text-right hidden lg:block leading-tight">
            <span className="text-emerald-400 font-semibold block">✓ Capture on completion</span>
            <span className="text-zinc-500">Must reach {challenge.minAccuracy}% acc</span>
          </div>

          <button
            onClick={() => {
              if (!isSubmitted) {
                setIsSubmitted(true);
                onSubmit(typedText);
              }
            }}
            disabled={isSubmitted || typedText.length === 0}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
          >
            <span>{isSubmitted ? 'Validating...' : 'Submit Assault'}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
