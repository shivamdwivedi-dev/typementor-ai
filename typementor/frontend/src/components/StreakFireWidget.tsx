import React, { useState, useEffect } from 'react';

interface StreakFireWidgetProps {
  streak: number;
}

const StreakFireWidget: React.FC<StreakFireWidgetProps> = ({ streak }) => {
  const [showModal, setShowModal] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
    const t = setTimeout(() => setAnimate(false), 600);
    return () => clearTimeout(t);
  }, [streak]);

  const flameSize = streak === 0 ? 'text-lg' : streak < 7 ? 'text-xl' : streak < 30 ? 'text-2xl' : 'text-3xl';
  const glowColor = streak === 0 ? '' : streak < 7 ? 'drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]' : streak < 30 ? 'drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]' : 'drop-shadow-[0_0_14px_rgba(234,179,8,1)]';
  const streakLabel = streak === 0 ? 'No streak' : streak === 1 ? '1 day' : `${streak} days`;

  return (
    <>
      {/* Widget Button */}
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300
          ${streak > 0 ? 'border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}
          ${animate ? 'scale-110' : 'scale-100'}`}
        title={`${streakLabel} streak`}
      >
        <span className={`${flameSize} ${glowColor} transition-all duration-300 ${streak > 0 ? 'animate-pulse' : ''}`}>
          🔥
        </span>
        <span className={`text-sm font-bold font-mono ${streak > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
          {streak}
        </span>
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative max-w-sm w-full mx-4 rounded-2xl border border-orange-500/30 bg-gradient-to-b from-orange-950/80 to-gray-900/90 p-8 text-center shadow-2xl"
            style={{ boxShadow: '0 0 40px rgba(251,146,60,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Flame */}
            <div className="text-6xl mb-4 animate-bounce drop-shadow-[0_0_20px_rgba(251,146,60,0.9)]">🔥</div>

            {streak > 0 ? (
              <>
                <h2 className="text-2xl font-black text-orange-400 mb-2">You're on fire!</h2>
                <p className="text-5xl font-black text-white mb-1">{streak}</p>
                <p className="text-orange-300 font-semibold mb-4">day streak</p>
                <p className="text-gray-300 text-sm mb-6">
                  {streak < 7
                    ? "Keep going! 7 days unlocks the Dedicated Typist badge 🏅"
                    : streak < 30
                    ? "Amazing! Keep the chain alive for 30 days for the Iron Fingers badge 💪"
                    : "Legendary! You've mastered the habit. 🏆"}
                </p>
                <div className="flex justify-center gap-4 text-sm text-gray-400">
                  <div className={`px-3 py-1 rounded-full ${streak >= 7 ? 'bg-orange-500/30 text-orange-300' : 'bg-white/5'}`}>7d 🏅</div>
                  <div className={`px-3 py-1 rounded-full ${streak >= 30 ? 'bg-orange-500/30 text-orange-300' : 'bg-white/5'}`}>30d 💪</div>
                  <div className={`px-3 py-1 rounded-full ${streak >= 100 ? 'bg-yellow-500/30 text-yellow-300' : 'bg-white/5'}`}>100d 👑</div>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-black text-gray-400 mb-2">No streak yet</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Practice every day to build a streak! Come back tomorrow after completing a lesson.
                </p>
              </>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 px-6 py-2 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-sm font-semibold hover:bg-orange-500/30 transition-all"
            >
              Keep typing! ⌨️
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default StreakFireWidget;
