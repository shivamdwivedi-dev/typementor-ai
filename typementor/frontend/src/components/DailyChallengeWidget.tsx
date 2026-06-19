import React, { useState, useEffect } from 'react';

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  criteriaType: 'WPM' | 'ACCURACY' | 'CHARS' | 'SESSIONS';
  targetValue: number;
  xpReward: number;
  expiresAt: string;
  currentValue?: number;
  isCompleted?: boolean;
}

interface DailyChallengeWidgetProps {
  challenges: DailyChallenge[];
  onChallengeClick?: () => void;
}

const FALLBACK_CHALLENGES: DailyChallenge[] = [
  {
    id: 'daily-1',
    title: 'Speed Burst',
    description: 'Reach 60+ WPM in any session',
    criteriaType: 'WPM',
    targetValue: 60,
    xpReward: 150,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    currentValue: 0,
    isCompleted: false
  },
  {
    id: 'daily-2',
    title: 'Precision Master',
    description: 'Complete a session with 95%+ accuracy',
    criteriaType: 'ACCURACY',
    targetValue: 95,
    xpReward: 120,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    currentValue: 0,
    isCompleted: false
  }
];

const criteriaIcon = (type: string) => {
  switch (type) {
    case 'WPM': return '⚡';
    case 'ACCURACY': return '🎯';
    case 'CHARS': return '⌨️';
    case 'SESSIONS': return '📚';
    default: return '🏆';
  }
};

const criteriaLabel = (type: string, value: number) => {
  switch (type) {
    case 'WPM': return `${value}+ WPM`;
    case 'ACCURACY': return `${value}%+ Accuracy`;
    case 'CHARS': return `${value.toLocaleString()} Characters`;
    case 'SESSIONS': return `${value} Session${value > 1 ? 's' : ''}`;
    default: return `${value}`;
  }
};

const DailyChallengeWidget: React.FC<DailyChallengeWidgetProps> = ({ challenges, onChallengeClick }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const displayChallenges = challenges.length > 0 ? challenges : FALLBACK_CHALLENGES;

  useEffect(() => {
    const tick = () => {
      if (displayChallenges.length === 0) return;
      const expires = new Date(displayChallenges[0].expiresAt).getTime();
      const diff = expires - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [displayChallenges]);

  const completedCount = displayChallenges.filter(c => c.isCompleted).length;
  const totalXp = displayChallenges.reduce((sum, c) => sum + c.xpReward, 0);

  return (
    <div className="rounded-2xl border border-white/8 bg-gray-900/70 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gradient-to-r from-purple-900/30 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚔️</span>
          <div>
            <span className="font-bold text-white text-sm block">Daily Challenges</span>
            <span className="text-xs text-gray-500">{completedCount}/{displayChallenges.length} complete · +{totalXp} XP available</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Resets in</div>
          <div className="text-xs font-mono font-bold text-purple-400">{timeLeft}</div>
        </div>
      </div>

      {/* Challenges */}
      <div className="p-3 space-y-2">
        {displayChallenges.map((challenge) => {
          const progress = challenge.criteriaType === 'WPM' || challenge.criteriaType === 'ACCURACY'
            ? Math.min(((challenge.currentValue || 0) / challenge.targetValue) * 100, 100)
            : Math.min(((challenge.currentValue || 0) / challenge.targetValue) * 100, 100);

          return (
            <div
              key={challenge.id}
              onClick={onChallengeClick}
              className={`relative rounded-xl p-3 cursor-pointer transition-all duration-200 border
                ${challenge.isCompleted
                  ? 'border-green-500/30 bg-green-500/10'
                  : 'border-white/5 bg-white/3 hover:bg-white/5 hover:border-purple-500/30'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`text-xl flex-shrink-0 mt-0.5 ${challenge.isCompleted ? 'grayscale-0' : ''}`}>
                  {challenge.isCompleted ? '✅' : criteriaIcon(challenge.criteriaType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-sm font-bold truncate ${challenge.isCompleted ? 'text-green-400' : 'text-white'}`}>
                      {challenge.title}
                    </span>
                    <span className="text-xs font-bold text-purple-400 flex-shrink-0">+{challenge.xpReward} XP</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{challenge.description}</p>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${challenge.isCompleted ? 'bg-green-500' : 'bg-purple-500'}`}
                        style={{ width: `${challenge.isCompleted ? 100 : progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-500 flex-shrink-0">
                      {challenge.isCompleted ? '✓' : criteriaLabel(challenge.criteriaType, challenge.targetValue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyChallengeWidget;
