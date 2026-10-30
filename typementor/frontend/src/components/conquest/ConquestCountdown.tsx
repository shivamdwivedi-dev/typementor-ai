import React, { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { playCountdownTickSound } from '../../utils/soundEffects';

interface ConquestCountdownProps {
  secondsRemaining: number;
}

export const ConquestCountdown: React.FC<ConquestCountdownProps> = ({ secondsRemaining }) => {
  useEffect(() => {
    playCountdownTickSound(secondsRemaining);
  }, [secondsRemaining]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="text-center space-y-5 max-w-md mx-auto px-6">
        <div className="inline-flex p-4 rounded-3xl bg-purple-600/20 border border-purple-500/40 text-purple-400 mb-1 shadow-lg shadow-purple-500/20">
          <ShieldAlert className="w-12 h-12 animate-pulse text-purple-400" />
        </div>

        <div className="space-y-1">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-[0.25em] bg-purple-500/10 text-purple-300 border border-purple-500/30">
            Both Commanders Ready
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Synchronizing Battlefield
          </h2>
        </div>

        <div className="relative flex items-center justify-center py-2">
          <span className="font-mono text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-purple-200 via-purple-400 to-indigo-600 drop-shadow-[0_12px_28px_rgba(168,85,247,0.5)] animate-pulse">
            {secondsRemaining}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-zinc-400 font-medium tracking-wide">
          Target adjacent cells first. Accuracy is defense. Prepare to strike!
        </p>
      </div>
    </div>
  );
};
