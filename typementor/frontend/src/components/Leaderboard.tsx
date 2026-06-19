import React, { useState, useEffect } from 'react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar?: string;
  wpm: number;
  xp: number;
  level: number;
  streak: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  currentUserId?: string;
  apiBase: string;
  token?: string;
}

const MOCK_LEADERS: LeaderboardEntry[] = [
  { rank: 1, name: 'DevMaster', wpm: 142, xp: 8400, level: 18, streak: 45 },
  { rank: 2, name: 'TypeNinja', wpm: 138, xp: 7900, level: 17, streak: 32 },
  { rank: 3, name: 'KeyWarrior', wpm: 127, xp: 7200, level: 16, streak: 21 },
  { rank: 4, name: 'CodeSpider', wpm: 118, xp: 6100, level: 14, streak: 14 },
  { rank: 5, name: 'AlphaCoder', wpm: 110, xp: 5300, level: 12, streak: 9 },
];

type SortMode = 'wpm' | 'xp';

const Leaderboard: React.FC<LeaderboardProps> = ({ currentUserId, apiBase, token }) => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>(MOCK_LEADERS);
  const [sortBy, setSortBy] = useState<SortMode>('wpm');
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/analytics/leaderboard?sort=${sortBy}&limit=10`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLeaders(data.map((u: any, i: number) => ({
            rank: i + 1,
            name: u.name,
            avatar: u.avatar,
            wpm: Math.round(u.lifetimeWpm || 0),
            xp: u.xp || 0,
            level: u.level || 1,
            streak: u.streak || 0,
            isCurrentUser: u.id === currentUserId
          })));
        }
      }
    } catch {
      // Keep mock data on failure
    } finally {
      setLoading(false);
      setLastRefresh(Date.now());
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, [sortBy]);

  const sorted = [...leaders].sort((a, b) => sortBy === 'wpm' ? b.wpm - a.wpm : b.xp - a.xp);

  const rankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-gray-900/70 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="font-bold text-white text-sm">Global Leaderboard</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs">
            <button
              onClick={() => setSortBy('wpm')}
              className={`px-2.5 py-1 font-semibold transition-colors ${sortBy === 'wpm' ? 'bg-cyan-500/30 text-cyan-300' : 'text-gray-500 hover:text-gray-300'}`}
            >
              WPM
            </button>
            <button
              onClick={() => setSortBy('xp')}
              className={`px-2.5 py-1 font-semibold transition-colors ${sortBy === 'xp' ? 'bg-purple-500/30 text-purple-300' : 'text-gray-500 hover:text-gray-300'}`}
            >
              XP
            </button>
          </div>
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            title="Refresh"
          >
            {loading ? '⟳' : '↺'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-white/5">
        {sorted.map((entry, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-2.5 transition-all
              ${entry.isCurrentUser ? 'bg-cyan-500/10 border-l-2 border-cyan-500' : 'hover:bg-white/3'}`}
          >
            {/* Rank */}
            <div className={`w-8 text-center font-black text-sm flex-shrink-0
              ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
              {rankEmoji(entry.rank)}
            </div>

            {/* Avatar */}
            {entry.avatar ? (
              <img src={entry.avatar} alt={entry.name} className="w-7 h-7 rounded-full border border-white/10 flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/40 to-purple-500/40 border border-white/10 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">
                {entry.name[0]}
              </div>
            )}

            {/* Name + Level */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-semibold truncate ${entry.isCurrentUser ? 'text-cyan-300' : 'text-white'}`}>
                  {entry.name}
                  {entry.isCurrentUser && <span className="text-xs text-cyan-500 ml-1">(you)</span>}
                </span>
                <span className="text-xs text-gray-600 font-mono flex-shrink-0">Lv.{entry.level}</span>
              </div>
              {entry.streak > 0 && (
                <div className="text-xs text-orange-400 font-mono">🔥 {entry.streak}d</div>
              )}
            </div>

            {/* Stat */}
            <div className="text-right flex-shrink-0">
              <div className={`text-sm font-black font-mono ${sortBy === 'wpm' ? 'text-cyan-400' : 'text-purple-400'}`}>
                {sortBy === 'wpm' ? `${entry.wpm} wpm` : `${entry.xp.toLocaleString()} xp`}
              </div>
              <div className="text-xs text-gray-600 font-mono">
                {sortBy === 'wpm' ? `${entry.xp.toLocaleString()} xp` : `${entry.wpm} wpm`}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/5">
        <p className="text-xs text-gray-600 text-center">
          Updates every 60 seconds · {new Date(lastRefresh).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default Leaderboard;
