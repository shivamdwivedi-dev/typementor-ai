import { useState, useEffect, useRef } from 'react';

export interface PulseStats {
  typedChars: { expected: string; actual: string; isMistake: boolean; timestamp: number }[];
  backspaces: { timestamp: number; isAfterMistake: boolean }[];
  wpm: number;
  accuracy: number;
  isCompleted: boolean;
}

export function useAICoachPulse() {
  const [pulseMessage, setPulseMessage] = useState<string | null>(null);
  const [isCoachEnabled, setIsCoachEnabled] = useState<boolean>(true);
  
  const lastPulseTime = useRef<number>(0);
  const pulseCount = useRef<number>(0);
  const hasShownBackspaceWarning = useRef<boolean>(false);

  // Sync with settings
  useEffect(() => {
    const checkSetting = () => {
      const saved = localStorage.getItem('typementor_ai_coach_pulses');
      if (saved !== null) {
        setIsCoachEnabled(saved === 'true');
      } else {
        setIsCoachEnabled(true);
      }
    };
    checkSetting();
    const interval = setInterval(checkSetting, 1000);
    return () => clearInterval(interval);
  }, []);

  const processPulse = (stats: PulseStats) => {
    const currentEnabled = localStorage.getItem('typementor_ai_coach_pulses') !== 'false';
    if (!currentEnabled) return;
    if (stats.isCompleted) return;
    if (pulseCount.current >= 3) return;

    const now = Date.now();

    // Analyze backspaces for gentle backspace reaction:
    const recentBackspaces = stats.backspaces.filter(b => now - b.timestamp < 10000);
    if (recentBackspaces.length >= 5 && !hasShownBackspaceWarning.current) {
      if (now - lastPulseTime.current >= 30000) {
        const warnings = [
          "Backspace panic detected 👀",
          "Your fingers are negotiating with the delete key.",
          "Try one clean line without corrections."
        ];
        const selectedWarning = warnings[Math.floor(Math.random() * warnings.length)];
        setPulseMessage(selectedWarning);
        hasShownBackspaceWarning.current = true;
        lastPulseTime.current = now;
        pulseCount.current += 1;
        return;
      }
    }

    // Cooldown check for regular pulses: 30 seconds
    if (now - lastPulseTime.current < 30000) return;

    // Trigger Rules:
    if (stats.wpm > 50 && stats.accuracy < 85 && stats.typedChars.length >= 20) {
      setPulseMessage("You are typing faster, but mistakes are rising. Balance speed and accuracy.");
      triggerPulse(now);
      return;
    }

    if (stats.accuracy < 85 && stats.typedChars.length >= 30) {
      setPulseMessage("Your accuracy is dropping. Slow down slightly to rebuild control.");
      triggerPulse(now);
      return;
    }

    const last20 = stats.typedChars.slice(-20);
    const mistakesInLast20 = last20.filter(c => c.isMistake).length;
    if (mistakesInLast20 >= 3 && last20.length >= 20) {
      const keyErrors: Record<string, number> = {};
      stats.typedChars.forEach(c => {
        if (c.isMistake) {
          const key = c.expected.toUpperCase();
          keyErrors[key] = (keyErrors[key] || 0) + 1;
        }
      });
      const sortedWeakKeys = Object.entries(keyErrors).sort((a, b) => b[1] - a[1]);
      const topWeakKey = sortedWeakKeys.length > 0 ? sortedWeakKeys[0][0] : null;

      if (topWeakKey && ['R', 'T', 'E', 'I', 'F', 'J', 'U', 'Y'].includes(topWeakKey)) {
        setPulseMessage(`Your ${topWeakKey} mistakes are increasing. Keep your index/middle fingers centered.`);
      } else {
        setPulseMessage("Your accuracy drops after speed bursts. Slow down slightly.");
      }
      triggerPulse(now);
      return;
    }

    let cleanStreak = 0;
    for (let i = stats.typedChars.length - 1; i >= 0; i--) {
      if (!stats.typedChars[i].isMistake) {
        cleanStreak++;
      } else {
        break;
      }
    }
    if (cleanStreak >= 40 && stats.typedChars.length >= 40) {
      setPulseMessage("Nice recovery. Your last 40 characters were clean.");
      triggerPulse(now);
      return;
    }

    const recentBS = stats.backspaces.filter(b => now - b.timestamp < 15000);
    if (recentBS.length >= 5) {
      setPulseMessage("You are correcting often with backspace. Try typing the next sentence without corrections.");
      triggerPulse(now);
      return;
    }
  };

  const triggerPulse = (timestamp: number) => {
    lastPulseTime.current = timestamp;
    pulseCount.current += 1;
  };

  const clearPulse = () => {
    setPulseMessage(null);
  };

  useEffect(() => {
    if (pulseMessage) {
      const timer = setTimeout(() => {
        setPulseMessage(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [pulseMessage]);

  return {
    pulseMessage,
    isCoachEnabled,
    processPulse,
    clearPulse,
    resetSessionState: () => {
      pulseCount.current = 0;
      hasShownBackspaceWarning.current = false;
      setPulseMessage(null);
    }
  };
}

import { BrainCircuit, X } from 'lucide-react';

interface AICoachPulseCardProps {
  message: string;
  onClose: () => void;
}

export function AICoachPulseCard({ message, onClose }: AICoachPulseCardProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-xs sm:max-w-sm w-full bg-slate-900/95 border border-brand-primary/45 rounded-2xl p-4 shadow-2xl glass-panel animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex gap-3">
        <div className="bg-brand-primary/10 p-2 rounded-xl text-brand-primary h-fit">
          <BrainCircuit className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1 space-y-1 text-left">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <span>AI Coach Pulse</span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-ping" />
          </h4>
          <p className="text-xs text-brand-text/90 leading-relaxed font-medium">
            "{message}"
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-brand-muted hover:text-white h-fit p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
