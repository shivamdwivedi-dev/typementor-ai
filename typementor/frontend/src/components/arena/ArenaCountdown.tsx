import React from 'react';
import { Swords } from 'lucide-react';

interface ArenaCountdownProps {
  secondsRemaining: number;
}

export const ArenaCountdown: React.FC<ArenaCountdownProps> = ({ secondsRemaining }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 rounded-3xl bg-blue-600/20 border border-blue-500/40 text-blue-400 mb-2">
          <Swords className="w-10 h-10 animate-bounce" />
        </div>
        <h2 className="text-sm uppercase tracking-[0.3em] font-extrabold text-blue-400">
          Both Players Ready
        </h2>
        <div className="relative flex items-center justify-center">
          <span className="font-mono text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-500 drop-shadow-[0_10px_20px_rgba(59,130,246,0.5)] animate-pulse">
            {secondsRemaining}
          </span>
        </div>
        <p className="text-xs text-zinc-400 font-semibold tracking-wider">
          Prepare your hands on the home row!
        </p>
      </div>
    </div>
  );
};
