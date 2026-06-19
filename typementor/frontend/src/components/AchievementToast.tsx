import React, { useState, useEffect, useCallback } from 'react';

interface Achievement {
  id: string;
  icon: string;
  name: string;
  description: string;
  xpReward: number;
}

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!achievement) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, 4000);
    return () => clearTimeout(t);
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-4 px-5 py-4 rounded-2xl
        border border-yellow-500/40 bg-gradient-to-r from-yellow-950/90 to-gray-900/95 shadow-2xl
        transition-all duration-400 ${visible ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}
      style={{ boxShadow: '0 0 30px rgba(234,179,8,0.3)', minWidth: '280px' }}
    >
      {/* Glow Ring */}
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 rounded-full bg-yellow-500/20 animate-ping" />
        <div className="relative w-12 h-12 rounded-full bg-yellow-500/20 border border-yellow-500/50
          flex items-center justify-center text-2xl">
          {achievement.icon}
        </div>
      </div>

      <div className="flex-1">
        <div className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-0.5">
          🏆 Achievement Unlocked!
        </div>
        <div className="text-white font-bold text-sm">{achievement.name}</div>
        <div className="text-gray-400 text-xs mt-0.5">{achievement.description}</div>
        <div className="text-yellow-400 text-xs font-bold mt-1">+{achievement.xpReward} XP</div>
      </div>

      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 400); }}
        className="text-gray-500 hover:text-gray-300 text-lg leading-none flex-shrink-0"
      >
        ×
      </button>
    </div>
  );
};

// Hook for managing achievement queue
export const useAchievementToast = () => {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [current, setCurrent] = useState<Achievement | null>(null);

  const addAchievement = useCallback((achievement: Achievement) => {
    setQueue(q => [...q, achievement]);
  }, []);

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(q => q.slice(1));
    }
  }, [current, queue]);

  const dismiss = useCallback(() => setCurrent(null), []);

  return { current, addAchievement, dismiss };
};

export default AchievementToast;
