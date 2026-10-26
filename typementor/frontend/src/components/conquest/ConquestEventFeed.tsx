import React from 'react';
import {
  Swords,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trophy,
  WifiOff,
  Wifi,
  Radio,
} from 'lucide-react';

export type ConquestFeedEventType =
  | 'ATTACK_STARTED'
  | 'OPPONENT_ATTACK_STARTED'
  | 'TERRITORY_CAPTURED'
  | 'ATTACK_FAILED'
  | 'PLAYER_DISCONNECTED'
  | 'PLAYER_RECONNECTED'
  | 'MATCH_FINISHED';

export interface ConquestFeedItem {
  id: string;
  type: ConquestFeedEventType;
  title: string;
  description: string;
  timestamp: number;
  isSelf?: boolean;
}

interface ConquestEventFeedProps {
  events: ConquestFeedItem[];
}

export const ConquestEventFeed: React.FC<ConquestEventFeedProps> = ({ events }) => {
  if (events.length === 0) return null;

  // Display the 4 most recent events
  const recentEvents = events.slice(-4).reverse();

  const getEventIcon = (type: ConquestFeedEventType) => {
    switch (type) {
      case 'ATTACK_STARTED':
        return <Swords className="w-3.5 h-3.5 text-purple-400" />;
      case 'OPPONENT_ATTACK_STARTED':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'TERRITORY_CAPTURED':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ATTACK_FAILED':
        return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
      case 'PLAYER_DISCONNECTED':
        return <WifiOff className="w-3.5 h-3.5 text-amber-400" />;
      case 'PLAYER_RECONNECTED':
        return <Wifi className="w-3.5 h-3.5 text-emerald-400" />;
      case 'MATCH_FINISHED':
        return <Trophy className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Radio className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getEventBorderClass = (type: ConquestFeedEventType) => {
    switch (type) {
      case 'TERRITORY_CAPTURED':
        return 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200';
      case 'OPPONENT_ATTACK_STARTED':
        return 'border-amber-500/50 bg-amber-950/40 text-amber-200';
      case 'ATTACK_FAILED':
        return 'border-rose-500/40 bg-rose-950/30 text-rose-200';
      case 'MATCH_FINISHED':
        return 'border-amber-500/60 bg-amber-950/50 text-amber-100';
      default:
        return 'border-zinc-800 bg-zinc-950/80 text-zinc-300';
    }
  };

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Battlefield Event Feed"
      className="w-full max-w-2xl mx-auto space-y-1.5"
    >
      <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-zinc-500 px-1">
        <span className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
          Tactical Live Feed
        </span>
        <span>Latest Server Events</span>
      </div>

      <div className="space-y-1.5">
        {recentEvents.map((item) => (
          <div
            key={item.id}
            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-md backdrop-blur-sm transition-all duration-200 animate-in fade-in slide-in-from-top-1 ${getEventBorderClass(
              item.type
            )}`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-1 rounded-lg bg-black/40 shrink-0">
                {getEventIcon(item.type)}
              </div>
              <div className="truncate">
                <span className="font-bold block truncate">{item.title}</span>
                <span className="text-[11px] opacity-80 block truncate">
                  {item.description}
                </span>
              </div>
            </div>

            <span className="text-[10px] font-mono opacity-50 shrink-0">
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
