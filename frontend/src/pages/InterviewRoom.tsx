import { useState, useEffect, useRef } from 'react';
import { useTypingStore } from '../store/TypingStore';
import { Timer, Skull, Award, AlertOctagon } from 'lucide-react';

// Mock candidates database for interview room
const INITIAL_CANDIDATES = [
  { rank: 1, name: 'Google Lead Dev', wpm: 92, progress: 100, isSelf: false },
  { rank: 2, name: 'Candidate #42', wpm: 78, progress: 85, isSelf: false },
  { rank: 3, name: 'Candidate #17', wpm: 68, progress: 70, isSelf: false },
  { rank: 4, name: 'You', wpm: 0, progress: 0, isSelf: true },
];

export default function InterviewRoom() {
  const {
    words,
    currentIndex,
    keystrokes,
    wpm,
    initializeSession,
    startSession,
    recordKeystroke,
    isActive,
    isCompleted,
  } = useTypingStore();

  const [timeLeft, setTimeLeft] = useState(60);
  const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
  const [errorCount, setErrorCount] = useState(0);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const interviewText = "SELECT name, email, wpm FROM candidates WHERE wpm > 80 ORDER BY accuracy DESC LIMIT 5;";

  useEffect(() => {
    // Reset typing engine and use strict SQL query text
    initializeSession(interviewText, 'SQL', 4);
    setErrorCount(0);
    setFailed(false);
    setTimeLeft(60);
    setCandidates(INITIAL_CANDIDATES);
  }, []);

  // Timer loop
  useEffect(() => {
    if (!isActive || isCompleted || failed) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setFailed(true);
          return 0;
        }
        return prev - 1;
      });

      // Update mock opponent stats slowly
      setCandidates((prev) => {
        return prev
          .map((c) => {
            if (c.isSelf) {
              return { ...c, wpm, progress: Math.min(100, Math.round((currentIndex / words.length) * 100)) };
            }
            // opposing candidates increase progress
            const speed = c.wpm;
            const newProg = Math.min(100, c.progress + Math.round(speed / 15));
            return { ...c, progress: newProg };
          })
          .sort((a, b) => b.progress - a.progress || b.wpm - a.wpm)
          .map((c, idx) => ({ ...c, rank: idx + 1 }));
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isCompleted, failed, wpm, currentIndex, words]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isCompleted || failed) return;

    if (!isActive) {
      startSession();
    }

    const key = e.key;

    // Strict Mode: Backspace is disabled!
    if (key === 'Backspace') {
      e.preventDefault();
      return;
    }

    if (key.length > 1 && key !== ' ') return;
    e.preventDefault();

    const expected = words[currentIndex];
    const isMistake = expected !== key;

    if (isMistake) {
      const nextErrors = errorCount + 1;
      setErrorCount(nextErrors);
      // Immediately fail if user makes more than 3 errors
      if (nextErrors > 3) {
        setFailed(true);
        return;
      }
    }

    recordKeystroke({
      expectedKey: expected,
      actualKey: key,
      timestamp: Date.now(),
      wordIndex: 0,
      holdTime: 80,
      isMistake,
    });
  };

  const handleReset = () => {
    initializeSession(interviewText, 'SQL', 4);
    setErrorCount(0);
    setFailed(false);
    setTimeLeft(60);
    setCandidates(INITIAL_CANDIDATES);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="flex justify-between items-center bg-brand-danger/5 border border-brand-danger/25 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger animate-pulse">
            <Skull className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base">Pressurized Interview Room</h3>
            <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">
              No Backspace • Max 3 Mistakes • Countdown Clock
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-brand-danger font-mono font-bold text-sm bg-brand-danger/10 px-3 py-1.5 rounded-xl border border-brand-danger/20">
            <Timer className="w-4 h-4" />
            <span>{timeLeft}s Left</span>
          </div>

          <div className="flex items-center gap-1.5 text-brand-warning font-mono font-bold text-sm bg-brand-warning/10 px-3 py-1.5 rounded-xl border border-brand-warning/20">
            <AlertOctagon className="w-4 h-4" />
            <span>{errorCount}/3 Errors</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Typing Board */}
        <div className="lg:col-span-2 space-y-4">
          <div
            onClick={() => inputRef.current?.focus()}
            className="glass-panel p-8 rounded-2xl border border-brand-border/40 min-h-[200px] flex items-center justify-center relative overflow-hidden"
          >
            {failed ? (
              <div className="text-center py-6">
                <div className="inline-flex p-3 rounded-full bg-brand-danger/10 border border-brand-danger/30 text-brand-danger mb-4">
                  <Skull className="w-8 h-8 animate-bounce" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Interview Failed</h4>
                <p className="text-xs text-brand-muted max-w-xs leading-relaxed">
                  You exceeded the mistake tolerance threshold or ran out of time. Keep trying to match speeds.
                </p>
                <button
                  onClick={handleReset}
                  className="mt-5 px-5 py-2.5 bg-brand-danger text-white rounded-xl font-bold hover:bg-brand-danger/90 text-xs transition-all shadow-md shadow-brand-danger/25"
                >
                  Try Again
                </button>
              </div>
            ) : isCompleted ? (
              <div className="text-center py-6">
                <div className="inline-flex p-3 rounded-full bg-brand-success/10 border border-brand-success/30 text-brand-success mb-4">
                  <Award className="w-8 h-8 animate-spin" />
                </div>
                <h4 className="text-lg font-bold text-brand-success mb-1">Interview Succeeded!</h4>
                <p className="text-xs text-brand-muted">
                  You completed the query. Check your placement rank on the leaderboard.
                </p>
                <button
                  onClick={handleReset}
                  className="mt-5 px-5 py-2.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 text-xs transition-all shadow-md"
                >
                  Restart Test
                </button>
              </div>
            ) : (
              <div className="w-full relative">
                <textarea
                  ref={inputRef}
                  value=""
                  onChange={() => {}}
                  onKeyDown={handleKeyDown}
                  className="absolute inset-0 opacity-0 cursor-default"
                />

                <div className="text-lg leading-relaxed font-mono select-none break-words flex flex-wrap gap-y-1">
                  {words.split('').map((char, index) => {
                    let charClass = 'text-brand-muted';
                    let caret = false;

                    if (index < currentIndex) {
                      const keyLog = keystrokes[index];
                      charClass = keyLog && !keyLog.isMistake ? 'text-brand-success' : 'text-brand-danger bg-brand-danger/10';
                    } else if (index === currentIndex) {
                      charClass = 'text-white bg-brand-primary/20 font-bold';
                      caret = true;
                    }

                    return (
                      <span key={index} className={`relative rounded ${charClass}`}>
                        {char === ' ' ? '␣' : char}
                        {caret && (
                          <span className="absolute left-0 bottom-0 top-0 w-[2px] bg-brand-primary animate-blink"></span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {!isActive && !isCompleted && !failed && (
              <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center pointer-events-none">
                <div className="bg-brand-card/95 border border-brand-border px-5 py-3 rounded-xl text-xs font-bold text-brand-danger uppercase animate-pulse">
                  Click inside to enter interview mode
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Leaderboard */}
        <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4">
          <h4 className="font-bold text-white text-sm border-b border-brand-border/30 pb-2">
            Live Placement Standings
          </h4>
          
          <div className="space-y-3">
            {candidates.map((c) => (
              <div
                key={c.name}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  c.isSelf
                    ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                    : 'bg-brand-bg/50 border-brand-border/30 text-brand-muted'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-bold font-mono text-sm">#{c.rank}</span>
                  <div className="text-left">
                    <span className="font-semibold text-xs text-white block">{c.name}</span>
                    <span className="text-[10px] text-brand-muted block mt-0.5">{c.progress}% typed</span>
                  </div>
                </div>
                
                <span className="font-bold font-mono text-xs text-white">{c.wpm} WPM</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
