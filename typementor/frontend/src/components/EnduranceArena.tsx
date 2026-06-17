import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/AuthStore';
import { getApiUrl } from '../utils/api';
import { generateEndurancePassage } from '../utils/endurancePassages';
import { soundEngine } from '../utils/soundEngine';
import { useAICoachPulse, AICoachPulseCard } from '../utils/aiCoachPulse';
import { saveLastActivity } from '../utils/ResumeTracker';
import {
  Trophy, Award,
  RefreshCw, ChevronRight, Activity, Clock, Timer
} from 'lucide-react';

type Rating = 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';

export default function EnduranceArena() {
  const { user, fetchProfile } = useAuthStore();
  const [step, setStep] = useState<'select' | 'practice' | 'results'>('select');
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Selection States
  const [selectedCategory, setSelectedCategory] = useState<string>('Technology');
  const [selectedLength, setSelectedLength] = useState<number>(200);

  // Typing Session States
  const [passage, setPassage] = useState<string>('');
  const [passageIdsUsed, setPassageIdsUsed] = useState<string[]>([]);
  const [typedText, setTypedText] = useState<string>('');
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [backspaceCount, setBackspaceCount] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [mostMistypedKey, setMostMistypedKey] = useState<string>('None');
  const [finalResult, setFinalResult] = useState<{
    wpm: number;
    accuracy: number;
    consistency: number;
    focusScore: number;
    duration: number;
    backspaceCount: number;
    errorCount: number;
    backspacesLog?: Array<{ timestamp: number; isAfterMistake: boolean }>;
  } | null>(null);

  // Keystrokes telemetry for detail logs and calculations
  const [keystrokesLog, setKeystrokesLog] = useState<Array<{
    expectedKey: string;
    actualKey: string;
    isMistake: boolean;
    timestamp: number;
  }>>([]);

  const [backspacesLog, setBackspacesLog] = useState<Array<{ timestamp: number; isAfterMistake: boolean }>>([]);

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pauseTime, setPauseTime] = useState<number | null>(null);

  // AI Coach Pulse Hook
  const { pulseMessage, processPulse, clearPulse, resetSessionState } = useAICoachPulse();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  const categories = ['Technology', 'AI', 'Science', 'Space', 'History', 'Programming', 'Business', 'Random'];
  const lengths = [200, 500, 1000];

  // Feed metrics to coaching processor reactively
  useEffect(() => {
    if (endTime !== null || !isStarted || step !== 'practice') return;

    const duration = startTime ? (Date.now() - startTime) / 60000 : 0;
    const currentWpm = duration > 0 ? Math.round((typedText.split(' ').length) / duration) : 0;
    const currentAcc = passage.length > 0 ? Math.max(0, Math.round(((passage.length - errorCount) / passage.length) * 100)) : 100;

    const typedChars = keystrokesLog.map(k => ({
      expected: k.expectedKey,
      actual: k.actualKey,
      isMistake: k.isMistake,
      timestamp: k.timestamp
    }));

    processPulse({
      typedChars,
      backspaces: backspacesLog,
      wpm: currentWpm,
      accuracy: currentAcc,
      isCompleted: endTime !== null
    });
  }, [typedText.length, backspacesLog.length, endTime, isStarted, step]);

  // Inactivity auto-pause logic
  useEffect(() => {
    if (!isStarted || endTime !== null || isPaused) return;

    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsPaused(true);
        setPauseTime(Date.now());
      }, 10000); // 10s idle threshold
    };

    const handleWindowBlur = () => {
      setIsPaused(true);
      setPauseTime(Date.now());
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
  }, [isStarted, endTime, isPaused]);

  const handleResume = () => {
    if (pauseTime && startTime) {
      const pausedDuration = Date.now() - pauseTime;
      setStartTime(prev => prev ? prev + pausedDuration : null);
    }
    setPauseTime(null);
    setIsPaused(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // ── Setup Session ──────────────────────────────────────────────────────────
  const startSession = () => {
    const recentlyUsedRaw = localStorage.getItem('endurance_recent_passages');
    const recentlyUsed: string[] = recentlyUsedRaw ? JSON.parse(recentlyUsedRaw) : [];

    const generated = generateEndurancePassage(selectedCategory, selectedLength, recentlyUsed);
    setPassage(generated.text);
    setPassageIdsUsed(generated.idsUsed);
    setTypedText('');
    setIsStarted(false);
    setStartTime(null);
    setEndTime(null);
    setBackspaceCount(0);
    setErrorCount(0);
    setMostMistypedKey('None');
    setKeystrokesLog([]);
    setBackspacesLog([]);
    setFinalResult(null);
    setShowExitConfirm(false);
    resetSessionState();
    setIsPaused(false);
    setPauseTime(null);
    setStep('practice');
    saveLastActivity({
      type: 'endurance',
      title: `Endurance Arena (${selectedCategory} - ${selectedLength} words)`
    });

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // ── Handle Key Inputs ─────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (endTime !== null || isPaused) return;
    const value = e.target.value;
    if (step !== 'practice') return;

    if (!isStarted) {
      setIsStarted(true);
      setStartTime(Date.now());
    }

    // Detect backspaces
    if (value.length < typedText.length) {
      setBackspaceCount(prev => prev + 1);
      soundEngine.play('backspace');

      // Pop last keystroke from keystrokesLog to check if it was a mistake
      const lastLogged = keystrokesLog[keystrokesLog.length - 1];
      const poppedIsMistake = lastLogged ? lastLogged.isMistake : false;
      
      setBackspacesLog(prev => [...prev, {
        timestamp: Date.now(),
        isAfterMistake: poppedIsMistake
      }]);
      setKeystrokesLog(prev => prev.slice(0, -1));

      setTypedText(value);
      return;
    }

    const currentLen = value.length;
    const lastCharIdx = currentLen - 1;
    const expectedChar = passage[lastCharIdx];
    const actualChar = value[lastCharIdx];
    const isMistake = expectedChar !== actualChar;

    if (isMistake) {
      setErrorCount(prev => prev + 1);
    }

    if (actualChar === ' ') {
      soundEngine.play('space');
    } else if (actualChar === '\n') {
      soundEngine.play('enter');
    } else {
      soundEngine.play('key');
    }

    // Append to telemetry logs
    const newLog = {
      expectedKey: expectedChar,
      actualKey: actualChar,
      isMistake,
      timestamp: Date.now()
    };
    const latestLogs = [...keystrokesLog, newLog];
    setKeystrokesLog(latestLogs);

    setTypedText(value);

    // End session when complete
    if (value.length === passage.length) {
      const completionTime = Date.now();
      setEndTime(completionTime);

      const durationSec = startTime ? (completionTime - startTime) / 1000 : 0;
      const wpm = durationSec > 0 ? Math.round((wordCount / (durationSec / 60))) : 0;
      const acc = passage.length > 0 ? Math.max(0, Math.round(((passage.length - (isMistake ? errorCount + 1 : errorCount)) / passage.length) * 100)) : 100;
      
      // Calculate consistency using latest logs
      let consistency = 85;
      if (latestLogs.length >= 50) {
        const blockTimes: number[] = [];
        let lastTime = startTime || Date.now();
        for (let i = 0; i < latestLogs.length; i += 25) {
          const block = latestLogs.slice(i, i + 25);
          if (block.length > 0) {
            const lastBlockTime = block[block.length - 1].timestamp;
            blockTimes.push(lastBlockTime - lastTime);
            lastTime = lastBlockTime;
          }
        }
        const avg = blockTimes.reduce((s, t) => s + t, 0) / blockTimes.length;
        const variance = blockTimes.reduce((s, t) => s + Math.pow(t - avg, 2), 0) / blockTimes.length;
        const stdDev = Math.sqrt(variance);
        consistency = Math.max(50, Math.min(100, Math.round(100 - stdDev / 20)));
      }

      const focus = Math.max(50, Math.min(100, Math.round(100 - ((backspaceCount) / passage.length) * 100)));

      const frozenResult = Object.freeze({
        wpm,
        accuracy: acc,
        consistency,
        focusScore: focus,
        duration: durationSec,
        backspaceCount,
        errorCount: isMistake ? errorCount + 1 : errorCount,
        backspacesLog
      });

      setFinalResult(frozenResult);
      setStep('results');
    }
  };

  // ── Telemetry calculations ────────────────────────────────────────────────
  const durationInSeconds = startTime && endTime ? (endTime - startTime) / 1000 : 0;
  const wordCount = passage.split(/\s+/).length;
  
  const averageWpm = durationInSeconds > 0 
    ? Math.round((wordCount / (durationInSeconds / 60))) 
    : 0;

  const accuracy = passage.length > 0 
    ? Math.max(0, Math.round(((passage.length - errorCount) / passage.length) * 100)) 
    : 100;

  const getEnduranceRating = (wpm: number, acc: number): Rating => {
    if (wpm >= 75 && acc >= 95) return 'Elite';
    if (wpm >= 50 && acc >= 90) return 'Advanced';
    if (wpm >= 30 && acc >= 85) return 'Intermediate';
    return 'Beginner';
  };

  // Compute most mistyped key from log
  useEffect(() => {
    if (step === 'results' && keystrokesLog.length > 0) {
      const mistakes = keystrokesLog.filter(k => k.isMistake);
      if (mistakes.length === 0) {
        setMostMistypedKey('None');
        return;
      }
      const counts: Record<string, number> = {};
      mistakes.forEach(m => {
        const key = m.expectedKey.toUpperCase();
        if (key && key !== ' ') {
          counts[key] = (counts[key] || 0) + 1;
        }
      });
      let maxKey = 'None';
      let maxCount = -1;
      Object.keys(counts).forEach(k => {
        if (counts[k] > maxCount) {
          maxCount = counts[k];
          maxKey = k;
        }
      });
      setMostMistypedKey(maxKey);

      // Save to anti-repetition passage memory
      const recentlyUsedRaw = localStorage.getItem('endurance_recent_passages');
      let recentlyUsed: string[] = recentlyUsedRaw ? JSON.parse(recentlyUsedRaw) : [];
      
      passageIdsUsed.forEach(id => {
        if (!recentlyUsed.includes(id)) {
          recentlyUsed.push(id);
        }
      });
      if (recentlyUsed.length > 30) {
        recentlyUsed = recentlyUsed.slice(-30);
      }
      localStorage.setItem('endurance_recent_passages', JSON.stringify(recentlyUsed));

      // Save session payload to local server if authenticated
      const token = localStorage.getItem('typementor_token');
      if (token && user) {
        const payload = {
          wpm: finalResult?.wpm || averageWpm,
          accuracy: finalResult?.accuracy || accuracy,
          mode: `Endurance: ${selectedCategory} ${selectedLength}`,
          difficulty: 1,
          keystrokes: keystrokesLog
        };
        fetch(getApiUrl('/api/sessions'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }).then(res => {
          if (res.ok) fetchProfile();
        }).catch(err => console.error('Error saving endurance session:', err));
      }
    }
  }, [step]);

  const focusTypingInput = () => {
    inputRef.current?.focus();
  };

  const wpmVal = finalResult ? finalResult.wpm : averageWpm;
  const accVal = finalResult ? finalResult.accuracy : accuracy;
  const consistencyVal = finalResult ? finalResult.consistency : 85;
  const ratingVal = getEnduranceRating(wpmVal, accVal);
  const durationVal = finalResult ? finalResult.duration : durationInSeconds;
  const errorCountVal = finalResult ? finalResult.errorCount : errorCount;
  const backspaceCountVal = finalResult ? finalResult.backspaceCount : backspaceCount;

  // Rating and stats calculations for results screen
  const ratio = passage.length > 0 ? backspaceCountVal / passage.length : 0;
  let habitRating = 'Low';
  let habitColor = 'text-brand-success';
  if (ratio > 0.12 || backspaceCountVal > 15) {
    habitRating = 'High';
    habitColor = 'text-brand-danger';
  } else if (ratio > 0.05 || backspaceCountVal > 5) {
    habitRating = 'Moderate';
    habitColor = 'text-brand-warning';
  }

  let bsAfterMistake = 0;
  let bsWithoutMistake = 0;
  const resultLog = finalResult?.backspacesLog || backspacesLog;
  if (resultLog && resultLog.length > 0) {
    resultLog.forEach((b: any) => {
      if (b.isAfterMistake) {
        bsAfterMistake++;
      } else {
        bsWithoutMistake++;
      }
    });
  } else {
    bsAfterMistake = errorCountVal;
    bsWithoutMistake = Math.max(0, backspaceCountVal - errorCountVal);
  }

  return (
    <div className="space-y-6 pb-12 text-left max-w-7xl mx-auto font-sans relative">
      {/* STEP 1: Selection Deck */}
      {step === 'select' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 md:col-span-2 space-y-6">
            <div className="border-b border-brand-border/30 pb-3">
              <h3 className="text-xl font-extrabold text-white">Endurance Arena</h3>
              <p className="text-xs text-brand-muted mt-1">Practice long-form typing using educational paragraph blocks. Avoid repeat-pattern muscle bias.</p>
            </div>

            {/* Category Selector */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-brand-muted uppercase tracking-wider block">Category topic</span>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                      selectedCategory === cat
                        ? 'bg-brand-primary border-brand-primary text-white shadow-md'
                        : 'bg-brand-card/25 border-brand-border/30 text-brand-muted hover:text-white hover:bg-brand-card/65'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Length Selector */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-brand-muted uppercase tracking-wider block">Target Length</span>
              <div className="grid grid-cols-3 gap-3">
                {lengths.map(len => (
                  <button
                    key={len}
                    onClick={() => setSelectedLength(len)}
                    className={`px-4 py-3.5 rounded-xl border text-xs font-bold transition-all ${
                      selectedLength === len
                        ? 'bg-brand-primary border-indigo-400 text-white shadow-lg shadow-brand-primary/25'
                        : 'bg-brand-card/35 border-brand-border/30 text-brand-muted hover:text-white hover:bg-brand-card/60'
                    }`}
                  >
                    {len} Words
                  </button>
                ))}
              </div>
            </div>

            {/* CTA Start */}
            <button
              onClick={startSession}
              className="w-full py-4 bg-brand-success hover:bg-brand-success/95 text-slate-950 font-black rounded-xl shadow-lg transition-transform active:scale-[0.99] text-sm tracking-wider uppercase"
            >
              Enter Arena & Start Typing
            </button>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4 text-left">
            <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-brand-border/30 pb-2">
              <Trophy className="w-5 h-5 text-brand-warning" />
              Arena Mechanics
            </h3>
            <ul className="space-y-3 text-xs text-brand-muted leading-relaxed">
              <li className="flex gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span><strong>No loops:</strong> Blocks of passages are compiled dynamically to minimize repetitions and keep you sharp.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-success font-bold">•</span>
                <span><strong>Accuracy Focus:</strong> Endurance checks accuracy and backspaces over a long period. High accuracy maintains pacing.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-warning font-bold">•</span>
                <span><strong>Elite rating:</strong> Maintain 75+ WPM speed combined with 95% accuracy over long lengths to reach the top tier.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* STEP 2: Active Practice Deck */}
      {step === 'practice' && (
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-brand-border/40 space-y-6 relative">
          {/* Header Progress and Indicators */}
          <div className="flex justify-between items-center border-b border-brand-border/30 pb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[10px] font-bold rounded-lg uppercase">
                {selectedCategory}
              </span>
              <span className="text-xs text-brand-muted font-bold font-mono">
                {typedText.length} / {passage.length} characters
              </span>
            </div>
            
            <button
              onClick={() => setShowExitConfirm(true)}
              className="text-xs text-brand-muted hover:text-brand-text flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Exit Arena
            </button>
          </div>

          {/* Hidden input to receive keyboard telemetry */}
          <textarea
            ref={inputRef}
            value={typedText}
            onChange={handleInputChange}
            className="absolute opacity-0 pointer-events-none"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />

          {/* Interactive Typing Board */}
          <div className="relative">
            <div
              ref={textContainerRef}
              onClick={() => !isPaused && focusTypingInput()}
              className="p-5 sm:p-6 bg-brand-bg/50 border border-brand-border/30 rounded-xl cursor-text select-none leading-relaxed text-base sm:text-lg tracking-wide font-mono text-slate-400 max-h-96 overflow-y-auto outline-none transition-all focus-within:border-brand-primary/60"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
            {passage.length === 0 ? (
              <div className="text-center text-xs text-brand-muted py-6">No passage available.</div>
            ) : (
              passage.split('').map((char, index) => {
                let colorClass = 'text-slate-500';
                let cursorClass = '';

                if (index < typedText.length) {
                  colorClass = typedText[index] === char 
                    ? 'text-white font-semibold' 
                    : 'text-brand-danger bg-brand-danger/10 border-b border-brand-danger';
                } else if (index === typedText.length) {
                  colorClass = 'text-brand-primary font-bold';
                  cursorClass = 'border-l-2 border-brand-primary animate-pulse';
                }

                return (
                  <span key={index} className={`${colorClass} ${cursorClass}`}>
                    {char}
                  </span>
                );
              })
            )}
            </div>

            {isPaused && isStarted && endTime === null && (
              <div
                className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-200 cursor-pointer rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResume();
                }}
              >
                <div className="bg-brand-card/90 border border-brand-border/80 p-5 rounded-2xl text-center max-w-sm mx-4 space-y-3 shadow-2xl">
                  <div className="inline-flex p-2.5 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary animate-pulse">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Arena Paused</h4>
                    <p className="text-[10px] text-brand-muted mt-1 leading-relaxed">
                      You have been inactive. Click or touch anywhere to resume.
                    </p>
                  </div>
                  <button className="w-full py-1.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold rounded-xl text-[11px] transition-all shadow-md">
                    Resume
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-xs text-brand-muted">
            <p>💡 Click on the text area to start typing.</p>
            {isStarted && (
              <span className="flex items-center gap-1.5 font-mono text-brand-primary font-bold">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                Active Telemetry Stream...
              </span>
            )}
          </div>

          {showExitConfirm && (
            <div className="absolute inset-0 bg-brand-bg/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-brand-card border border-brand-border/60 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl animate-in scale-in duration-200">
                <h4 className="text-base font-extrabold text-white">Exit Session?</h4>
                <p className="text-xs text-brand-muted leading-relaxed">Are you sure you want to quit this session? Your current typing telemetry will be discarded.</p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowExitConfirm(false);
                      setStep('select');
                    }}
                    className="flex-1 py-2 bg-brand-danger text-white text-xs font-bold rounded-xl hover:bg-brand-danger/90 transition-all"
                  >
                    Yes, Exit
                  </button>
                  <button
                    onClick={() => {
                      setShowExitConfirm(false);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="flex-1 py-2 bg-brand-card border border-brand-border text-white text-xs font-bold rounded-xl hover:bg-brand-card/80 transition-all"
                  >
                    No, Continue
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Results screen */}
      {step === 'results' && (
        <div className="space-y-6">
          {/* Main summary header */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-brand-border/40 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-r from-slate-900 via-brand-bg/60 to-slate-900">
            <div className="text-center sm:text-left space-y-1">
              <h3 className="text-2xl font-black text-white tracking-tight">Endurance Practice Complete</h3>
              <p className="text-xs text-brand-muted">Excellent effort. Performance ratings and telemetry details calculated below.</p>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={startSession}
                className="px-5 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-brand-primary/25 border border-indigo-400/20"
              >
                <RefreshCw className="w-4 h-4" />
                Practice Again
              </button>
              <button
                onClick={() => setStep('select')}
                className="px-5 py-3 bg-brand-card hover:bg-brand-card/80 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-brand-border"
              >
                Configure Arena
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="glass-panel p-5 rounded-2xl border border-brand-border/40">
              <div className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Average Speed</div>
              <div className="text-3xl font-black text-brand-primary mt-2 font-mono">{wpmVal} WPM</div>
              <p className="text-[10px] text-brand-muted mt-1">Net typing speed calculated</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-brand-border/40">
              <div className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Accuracy</div>
              <div className="text-3xl font-black text-brand-success mt-2 font-mono">{accVal}%</div>
              <p className="text-[10px] text-brand-muted mt-1">Laser telemetry accuracy</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-brand-border/40">
              <div className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Consistency Score</div>
              <div className="text-3xl font-black text-brand-warning mt-2 font-mono">{consistencyVal}%</div>
              <p className="text-[10px] text-brand-muted mt-1">Pacing variance profile</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-brand-border/40">
              <div className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Endurance Rating</div>
              <div className={`text-3xl font-black mt-2 font-mono ${
                ratingVal === 'Elite' ? 'text-purple-400' :
                ratingVal === 'Advanced' ? 'text-brand-success' :
                ratingVal === 'Intermediate' ? 'text-brand-warning' : 'text-brand-muted'
              }`}>
                {ratingVal}
              </div>
              <p className="text-[10px] text-brand-muted mt-1">Overall pacing difficulty tier</p>
            </div>
          </div>

          {/* Detailed stats panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 md:col-span-2 space-y-4">
              <h4 className="font-bold text-white text-sm flex items-center gap-2 border-b border-brand-border/30 pb-2">
                <Activity className="w-4 h-4 text-brand-primary" />
                Session Telemetry Summary
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="flex justify-between p-2.5 bg-brand-bg/50 border border-brand-border/20 rounded-xl">
                  <span className="text-brand-muted">Words Typed:</span>
                  <span className="text-white font-bold">{wordCount} Words</span>
                </div>
                <div className="flex justify-between p-2.5 bg-brand-bg/50 border border-brand-border/20 rounded-xl">
                  <span className="text-brand-muted">Time Taken:</span>
                  <span className="text-white font-bold">{Math.floor(durationVal / 60)}:{(durationVal % 60).toFixed(0).padStart(2, '0')}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-brand-bg/50 border border-brand-border/20 rounded-xl">
                  <span className="text-brand-muted">Error Count:</span>
                  <span className="text-brand-danger font-bold">{errorCountVal} chars</span>
                </div>
                <div className="flex justify-between p-2.5 bg-brand-bg/50 border border-brand-border/20 rounded-xl">
                  <span className="text-brand-muted">Backspace Count:</span>
                  <span className="text-brand-warning font-bold">{backspaceCountVal} keys</span>
                </div>
                <div className="flex justify-between p-2.5 bg-brand-bg/50 border border-brand-border/20 rounded-xl">
                  <span className="text-brand-muted">Correction Habit:</span>
                  <span className={`${habitColor} font-bold`}>{habitRating}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-brand-bg/50 border border-brand-border/20 rounded-xl">
                  <span className="text-brand-muted">Corrected Mistakes:</span>
                  <span className="text-brand-success font-bold">{bsAfterMistake} keys</span>
                </div>
                <div className="flex justify-between p-2.5 bg-brand-bg/50 border border-brand-border/20 rounded-xl">
                  <span className="text-brand-muted">Deleted Clean Keys:</span>
                  <span className="text-brand-danger font-bold">{bsWithoutMistake} keys</span>
                </div>
                <div className="flex justify-between p-2.5 bg-brand-bg/50 border border-brand-border/20 rounded-xl">
                  <span className="text-brand-muted">Most Mistyped Key:</span>
                  <span className="text-brand-danger font-bold uppercase">{mostMistypedKey}</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4">
              <h4 className="font-bold text-white text-sm flex items-center gap-2 border-b border-brand-border/30 pb-2">
                <Award className="w-4 h-4 text-brand-warning" />
                Pacing Guide
              </h4>
              <div className="space-y-3.5 text-left">
                <div className="flex items-center justify-between text-xs border-b border-brand-border/20 pb-1.5">
                  <span className="text-purple-400 font-bold">Elite</span>
                  <span className="text-brand-muted">WPM &ge; 75 &amp; Acc &ge; 95%</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-brand-border/20 pb-1.5">
                  <span className="text-brand-success font-bold">Advanced</span>
                  <span className="text-brand-muted">WPM &ge; 50 &amp; Acc &ge; 90%</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-brand-border/20 pb-1.5">
                  <span className="text-brand-warning font-bold">Intermediate</span>
                  <span className="text-brand-muted">WPM &ge; 30 &amp; Acc &ge; 85%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-brand-muted font-bold">Beginner</span>
                  <span className="text-brand-muted">WPM &lt; 30 or Acc &lt; 85%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Coach Pulse Card floating badge */}
      {pulseMessage && (
        <AICoachPulseCard
          message={pulseMessage}
          onClose={clearPulse}
        />
      )}
    </div>
  );
}
