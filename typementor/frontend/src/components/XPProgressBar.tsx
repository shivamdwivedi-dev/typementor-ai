import React, { useEffect, useRef, useState } from 'react';

interface XPProgressBarProps {
  xp: number;
  level: number;
}

// XP required to go from level N to level N+1
const xpForLevel = (level: number) => Math.floor(100 * Math.pow(1.4, level - 1));

const XPProgressBar: React.FC<XPProgressBarProps> = ({ xp, level }) => {
  const xpNeeded = xpForLevel(level);
  const xpProgress = Math.min(xp, xpNeeded);
  const pct = Math.min((xpProgress / xpNeeded) * 100, 100);
  const [displayPct, setDisplayPct] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const prevLevel = useRef(level);

  // Animate fill on mount / change
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDisplayPct(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  // Detect level-up
  useEffect(() => {
    if (level > prevLevel.current) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }
    prevLevel.current = level;
  }, [level]);

  return (
    <>
      {/* Level-up Banner */}
      {showLevelUp && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-8 py-3 rounded-full
          bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-black text-lg shadow-2xl
          animate-bounce" style={{ boxShadow: '0 0 40px rgba(99,102,241,0.8)' }}>
          ⚡ LEVEL UP! → Level {level} ⚡
        </div>
      )}

      {/* XP Bar Strip */}
      <div className="w-full flex items-center gap-3 px-4 py-1.5 bg-gray-950/60 border-b border-white/5">
        {/* Level Badge */}
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600
          flex items-center justify-center text-xs font-black text-white shadow-lg"
          style={{ boxShadow: '0 0 8px rgba(99,102,241,0.6)' }}>
          {level}
        </div>

        {/* Progress Bar */}
        <div className="flex-1 relative h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${displayPct}%`,
              background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)',
              boxShadow: '0 0 8px rgba(99,102,241,0.6)'
            }}
          />
          {/* Shimmer */}
          <div
            className="absolute inset-y-0 left-0 rounded-full opacity-40"
            style={{
              width: `${displayPct}%`,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              animation: 'xpShimmer 2s infinite'
            }}
          />
        </div>

        {/* XP Text */}
        <div className="flex-shrink-0 text-xs font-mono text-gray-400 whitespace-nowrap">
          <span className="text-cyan-400 font-bold">{xpProgress}</span>
          <span className="text-gray-600"> / </span>
          <span>{xpNeeded} XP</span>
        </div>
      </div>
    </>
  );
};

export default XPProgressBar;
