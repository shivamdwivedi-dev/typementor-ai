import { useAuthStore } from '../store/AuthStore';
import { useTypingStore } from '../store/TypingStore';
import { exportPerformancePdf } from '../utils/pdfGenerator';
import { Download, Trophy, Star, Shield, Lock, Flame, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Default mock achievements if user is guest
const DEFAULT_ACHIEVEMENTS = [
  { code: 'FIRST_SESSION', name: 'First Keystrokes', description: 'Complete your first typing session.', icon: '✨', unlocked: false, xp: 100 },
  { code: 'STREAK_3', name: 'Consistent', description: 'Maintain a 3-day typing streak.', icon: '🔥', unlocked: false, xp: 150 },
  { code: 'STREAK_7', name: 'Dedicated', description: 'Maintain a 7-day typing streak.', icon: '🏅', unlocked: false, xp: 300 },
  { code: 'WPM_60', name: 'Fast Fingers', description: 'Reach a typing speed of 60 WPM.', icon: '⚡', unlocked: false, xp: 200 },
  { code: 'WPM_80', name: 'Speed Demon', description: 'Reach a typing speed of 80 WPM.', icon: '🚀', unlocked: false, xp: 350 },
  { code: 'WPM_100', name: 'Grandmaster Typist', description: 'Reach a typing speed of 100 WPM.', icon: '👑', unlocked: false, xp: 500 },
  { code: 'ACC_95', name: 'Sharpshooter I', description: 'Complete a session with at least 95% accuracy.', icon: '🎯', unlocked: false, xp: 200 },
  { code: 'ACC_98', name: 'Accuracy Master', description: 'Complete a session with at least 98% accuracy.', icon: '🔭', unlocked: false, xp: 300 },
  { code: 'ACC_99', name: 'Laser Precision', description: 'Complete a session with at least 99% accuracy.', icon: '🔭', unlocked: false, xp: 400 },
  { code: 'CHARS_10000', name: 'Novelist', description: 'Type a total of 10,000 characters.', icon: '📖', unlocked: false, xp: 400 },
  { code: 'SESSIONS_100', name: 'Century Club', description: 'Complete 100 typing sessions.', icon: '🏆', unlocked: false, xp: 500 },
];

export default function Profile() {
  const { user } = useAuthStore();
  const { wpm, accuracy } = useTypingStore();

  const name = user?.name || 'Guest User';
  const email = user?.email || 'guest@typementor.ai';
  const totalXp = user?.xp || 0;
  const level = Math.min(100, Math.floor(totalXp / 500) + 1);
  const xp = totalXp % 500;
  const streak = user?.streak || 0;
  const longestStreak = user?.longestStreak || 0;
  const xpNeeded = 500;
  const xpPercentage = Math.round((xp / xpNeeded) * 100);

  // Compile achievements
  const getAchievements = () => {
    if (user?.achievements && user.achievements.length > 0) {
      const unlockedSet = new Set(user.achievements.map((a: any) => a.achievement.code));
      return DEFAULT_ACHIEVEMENTS.map(ach => ({
        ...ach,
        unlocked: unlockedSet.has(ach.code)
      }));
    }
    return DEFAULT_ACHIEVEMENTS;
  };

  const achievements = getAchievements();

  // Active challenges list
  const getChallenges = () => {
    if (user?.challenges && user.challenges.length > 0) {
      return user.challenges;
    }
    return [
      { id: 'c1', currentValue: 2, challenge: { title: 'Daily Warmup', targetValue: 3, description: 'Complete 3 typing sessions today.', xpReward: 50 } },
      { id: 'c2', currentValue: 4500, challenge: { title: 'Weekly Marathon', targetValue: 5000, description: 'Type a total of 5,000 characters this week.', xpReward: 250 } },
    ];
  };

  const challenges = getChallenges();

  const handleDownloadReport = () => {
    exportPerformancePdf(user, wpm, accuracy);
  };

  // Compile XP history log data (last 5 levels)
  const getXpHistoryData = () => {
    const data = [];
    const baseLevel = Math.max(1, level - 4);
    for (let i = baseLevel; i <= level; i++) {
      data.push({
        level: `Lvl ${i}`,
        xp: i === level ? totalXp : (i - 1) * 500,
      });
    }
    return data;
  };

  const xpHistory = getXpHistoryData();

  return (
    <div className="space-y-8 pb-12">
      {/* Profile Header Summary */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-brand-border/40 relative overflow-hidden flex flex-col sm:flex-row items-center gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Profile Avatar Badge */}
        <div className="relative">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-brand-primary/30 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-brand-primary/20 border border-brand-primary/30 rounded-2xl flex items-center justify-center text-brand-primary">
              <Trophy className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
          )}
          <span className="absolute -bottom-2 -right-2 bg-brand-warning text-slate-950 text-xs font-black rounded-lg px-2 py-0.5 border-2 border-brand-bg shadow-md">
            Lvl {level}
          </span>
        </div>

        {/* Name and details */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <h2 className="text-2xl font-black text-white">{name}</h2>
          <p className="text-xs text-brand-muted font-mono">{email}</p>
          
          {/* XP Bar */}
          <div className="max-w-md mt-4 space-y-1.5 mx-auto sm:mx-0">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-brand-muted">
              <span>Experience (XP)</span>
              <span>{xp} / {xpNeeded} XP ({xpPercentage}%)</span>
            </div>
            <div className="w-full bg-brand-card rounded-lg h-3 overflow-hidden border border-brand-border/50 p-[1.5px]">
              <div
                className="bg-brand-success h-full rounded-md transition-all duration-500 shadow-sm shadow-brand-success/35"
                style={{ width: `${xpPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Action Button: Download PDF */}
        <button
          onClick={handleDownloadReport}
          className="px-6 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold rounded-xl shadow-lg shadow-brand-primary/20 transition-all text-xs sm:text-sm flex items-center gap-2 border border-indigo-400/25"
        >
          <Download className="w-4 h-4" />
          Download PDF Report
        </button>
      </div>

      {/* Daily Streak & XP History Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-brand-muted uppercase font-extrabold tracking-wider">Active Daily Streak</span>
            <div className="text-2xl font-black text-brand-warning font-mono">{streak} Days</div>
          </div>
          <div className="bg-brand-warning/10 p-2.5 rounded-xl text-brand-warning">
            <Flame className="w-6 h-6 fill-brand-warning/10" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-brand-muted uppercase font-extrabold tracking-wider">Longest Practice Streak</span>
            <div className="text-2xl font-black text-brand-success font-mono">{longestStreak} Days</div>
          </div>
          <div className="bg-brand-success/10 p-2.5 rounded-xl text-brand-success">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-brand-muted uppercase font-extrabold tracking-wider">Total Accumulated XP</span>
            <div className="text-2xl font-black text-brand-primary font-mono">{totalXp.toLocaleString()} XP</div>
          </div>
          <div className="bg-brand-primary/10 p-2.5 rounded-xl text-brand-primary">
            <Trophy className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* XP History Chart & Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* XP History progression chart */}
        <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4 lg:col-span-2">
          <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-brand-border/30 pb-2">
            <Trophy className="w-5 h-5 text-brand-primary" />
            XP Progression History
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={xpHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="level" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="xp" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} name="Total XP" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Challenges Progress */}
        <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4 lg:col-span-1">
          <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-brand-border/30 pb-2">
            <Star className="w-5 h-5 text-brand-warning" />
            Active Challenges
          </h3>
          <div className="space-y-4">
            {challenges.map((c: any) => {
              const target = c.challenge.targetValue;
              const current = c.currentValue;
              const percent = Math.min(100, Math.round((current / target) * 100));

              return (
                <div key={c.id} className="space-y-2 bg-brand-bg/40 p-3 rounded-xl border border-brand-border/20">
                  <div className="flex justify-between items-start">
                    <div className="text-left">
                      <span className="font-bold text-xs text-white block">{c.challenge.title}</span>
                      <span className="text-[10px] text-brand-muted block mt-0.5">{c.challenge.description}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase text-brand-warning bg-brand-warning/10 px-1.5 py-0.5 rounded leading-none">
                      +{c.challenge.xpReward} XP
                    </span>
                  </div>
                  
                  {/* Progress Indicator */}
                  <div className="space-y-1">
                    <div className="w-full bg-brand-card rounded-md h-2 overflow-hidden">
                      <div
                        className="bg-brand-warning h-full rounded-md"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-brand-muted">
                      <span>Progress</span>
                      <span>{current.toLocaleString()} / {target.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Achievement Showcase */}
      <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-brand-border/30 pb-2">
          <Trophy className="w-5 h-5 text-brand-warning animate-pulse" />
          Achievement Showcase
        </h3>
        {achievements.filter(ach => ach.unlocked).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {achievements.filter(ach => ach.unlocked).slice(0, 3).map((ach) => (
              <div
                key={ach.code}
                className="relative bg-gradient-to-br from-brand-primary/10 to-brand-warning/5 border-2 border-brand-warning/35 p-6 rounded-2xl flex flex-col items-center text-center shadow-lg shadow-brand-warning/5 hover:scale-[1.03] transition-all"
              >
                <div className="absolute top-2 right-2 bg-brand-warning/20 text-brand-warning text-[8px] font-black uppercase px-2 py-0.5 rounded-md">
                  Showcase
                </div>
                <div className="text-4xl mb-3">{ach.icon}</div>
                <span className="font-extrabold text-sm text-white block">{ach.name}</span>
                <p className="text-xs text-brand-muted mt-1 leading-relaxed">{ach.description}</p>
                <span className="text-[10px] font-mono font-black text-brand-warning bg-brand-warning/10 px-2.5 py-1 rounded-lg mt-4 block border border-brand-warning/20">
                  +{ach.xp} XP Granted
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-brand-muted border border-dashed border-brand-border/40 rounded-xl bg-brand-card/10">
            No unlocked achievements are highlighted here yet. Unlock achievements to show them off!
          </div>
        )}
      </div>

      {/* Achievements Shelf */}
      <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-brand-border/30 pb-2">
          <Shield className="w-5 h-5 text-brand-primary" />
          Achievements Unlocked
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((ach) => (
            <div
              key={ach.code}
              className={`p-4 rounded-xl border flex gap-3 transition-all ${
                ach.unlocked
                  ? 'bg-brand-card/45 border-brand-border/60 text-brand-text'
                  : 'bg-brand-bg/25 border-brand-border/20 opacity-50 select-none'
              }`}
            >
              <div className="text-2xl mt-0.5">{ach.unlocked ? ach.icon : <Lock className="w-6 h-6 text-brand-muted" />}</div>
              <div className="text-left">
                <span className="font-bold text-xs text-white flex items-center gap-1.5">
                  {ach.name}
                  {ach.unlocked && (
                    <span className="text-[9px] bg-brand-success/10 text-brand-success px-1.5 py-0.5 rounded font-black leading-none">
                      Unlocked
                    </span>
                  )}
                </span>
                <p className="text-[10px] text-brand-muted mt-1 leading-relaxed">{ach.description}</p>
                <span className="text-[8px] font-bold uppercase tracking-wider text-brand-muted mt-2 block font-mono">
                  Reward: +{ach.xp} XP
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
