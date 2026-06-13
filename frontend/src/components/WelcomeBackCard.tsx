import { BookOpen, Activity, Compass, Clock, Play, X, Star } from 'lucide-react';
import { ResumeTarget, LastActivity } from '../utils/ResumeTracker';

interface WelcomeBackCardProps {
  userName: string;
  lastActivity: LastActivity | null;
  resumeTarget: ResumeTarget;
  completedCount: number;
  totalLessons: number;
  onContinue: () => void;
  onClose: () => void;
}

export default function WelcomeBackCard({
  userName,
  lastActivity,
  resumeTarget,
  completedCount,
  totalLessons,
  onContinue,
  onClose,
}: WelcomeBackCardProps) {
  // Format last seen timestamp
  const formatLastSeen = (ts?: number) => {
    if (!ts) return 'recently';
    const diffMs = Date.now() - ts;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Get activity icon & estimated completion times
  const getActivityMeta = (type: string) => {
    switch (type) {
      case 'academy':
        return { icon: <BookOpen className="w-5 h-5 text-brand-primary" />, estTime: '4 minutes', color: 'text-brand-primary' };
      case 'recovery':
        return { icon: <Compass className="w-5 h-5 text-brand-danger" />, estTime: '3 minutes', color: 'text-brand-danger' };
      case 'endurance':
        return { icon: <Activity className="w-5 h-5 text-brand-warning" />, estTime: '5 minutes', color: 'text-brand-warning' };
      default:
        return { icon: <Star className="w-5 h-5 text-brand-success" />, estTime: '2 minutes', color: 'text-brand-success' };
    }
  };

  const meta = getActivityMeta(resumeTarget.type);
  const progressPercent = Math.min(100, Math.round((completedCount / totalLessons) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-brand-bg/95 border border-brand-border/90 glass-panel rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-left transform scale-100 transition-transform duration-300">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-brand-card/85 text-brand-muted hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Greeting */}
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Welcome Back,</span>
            <span className="text-brand-primary">{userName}</span>
          </h2>
          <p className="text-[10px] text-brand-muted uppercase tracking-widest font-black">
            TypeMentor Intelligence Assistant
          </p>
        </div>

        {/* Details Card */}
        <div className="bg-brand-card/45 border border-brand-border/60 p-5 rounded-2xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-[9px] text-brand-muted uppercase font-extrabold tracking-wider block">
                Last Resolved Activity
              </span>
              <div className="flex items-center gap-2">
                {meta.icon}
                <span className="font-extrabold text-sm text-white leading-tight">
                  {lastActivity?.title || 'Starting fresh session'}
                </span>
              </div>
            </div>
            {lastActivity?.timestamp && (
              <span className="text-[9px] text-brand-muted font-bold block bg-brand-bg px-2 py-0.5 rounded border border-brand-border/30">
                {formatLastSeen(lastActivity.timestamp)}
              </span>
            )}
          </div>

          {/* Progress Indicators */}
          <div className="space-y-2 border-t border-brand-border/30 pt-3">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-brand-muted">Academy Progress</span>
              <span className="text-white font-mono">{completedCount} / {totalLessons} Lessons ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-brand-bg rounded-full h-2.5 overflow-hidden border border-brand-border/40 p-[1px]">
              <div
                className="bg-brand-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Estimates */}
          <div className="flex items-center justify-between text-[10px] font-bold text-brand-muted pt-1">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Est. Duration: <strong className="text-white font-mono">{meta.estTime}</strong></span>
            </div>
            <span className="text-[9px] uppercase tracking-wider text-brand-primary">Next Activity Auto-Selected</span>
          </div>
        </div>

        {/* Target Action */}
        <div className="space-y-2.5 pt-2">
          <div className="text-[10px] text-brand-muted flex items-center gap-1.5 px-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-success animate-ping"></span>
            <span>Recommended: <strong className="text-white">{resumeTarget.title}</strong></span>
          </div>
          <button
            onClick={onContinue}
            className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold py-3.5 rounded-2xl shadow-xl shadow-brand-primary/25 hover:shadow-brand-primary/35 transition-all text-sm flex items-center justify-center gap-2 border border-indigo-400/35"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Continue Learning</span>
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-transparent hover:bg-brand-card/30 text-brand-muted hover:text-white font-bold py-2.5 rounded-2xl transition-all text-xs border border-transparent hover:border-brand-border/40"
          >
            Choose Another Activity
          </button>
        </div>

      </div>
    </div>
  );
}
