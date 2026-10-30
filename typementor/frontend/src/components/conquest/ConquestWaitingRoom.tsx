import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Swords, Crown, UserCheck, Clock, X, HelpCircle, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { PublicConquestMatch } from '../../types/conquest';
import { playOpponentJoinedSound, playReadySound } from '../../utils/soundEffects';

interface ConquestWaitingRoomProps {
  match: PublicConquestMatch;
  currentUserId: string;
  onReady: () => void;
  onCancel?: () => void;
  onOpenTutorial?: () => void;
  isReady: boolean;
}

export const ConquestWaitingRoom: React.FC<ConquestWaitingRoomProps> = ({
  match,
  currentUserId,
  onReady,
  onCancel,
  onOpenTutorial,
  isReady,
}) => {
  const [copied, setCopied] = useState(false);
  const [isReadyPending, setIsReadyPending] = useState(false);
  const prevP2Ref = useRef<boolean>(false);

  const p1 = match.participants.find((p) => p.seat === 1);
  const p2 = match.participants.find((p) => p.seat === 2);
  const isCreator = match.creatorId === currentUserId;

  // Sound hint when rival commander enters war room
  useEffect(() => {
    const hasP2 = Boolean(p2);
    if (!prevP2Ref.current && hasP2) {
      playOpponentJoinedSound();
    }
    prevP2Ref.current = hasP2;
  }, [p2]);

  // Sync optimistic ready state
  useEffect(() => {
    if (isReady) {
      setIsReadyPending(false);
    }
  }, [isReady]);

  const handleCopyCode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(match.matchCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReadyClick = () => {
    setIsReadyPending(true);
    playReadySound();
    onReady();
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl bg-zinc-950/90 border border-zinc-800 p-6 sm:p-8 space-y-7 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5 text-purple-400" />
          <span>Tactical War Room</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Assembling Commanders
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Share your match code with your rival to begin the conquest of the 6×6 realm.
        </p>

        {onOpenTutorial && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenTutorial}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs font-bold transition-all shadow-sm"
            >
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span>How to Play (Interactive Tutorial)</span>
            </button>
          </div>
        )}
      </div>

      {/* Match Code Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">
            Invite Code
          </span>
          <span className="font-mono text-3xl sm:text-4xl font-black text-purple-300 tracking-widest">
            {match.matchCode}
          </span>
        </div>
        <button
          onClick={handleCopyCode}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Code Copied!' : 'Copy Code'}</span>
        </button>
      </div>

      {/* Seated Players Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Player 1 Slot (Blue Citadel) */}
        <div className="p-5 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">
              <Crown className="w-3 h-3" />
              <span>Player 1 (Blue)</span>
            </span>
            {p1?.isReady && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Ready</span>
              </span>
            )}
          </div>

          <div>
            <span className="font-bold text-base text-white block">
              {p1?.user.name || 'Commander 1'}
            </span>
            <span className="text-[11px] text-blue-400/80 font-mono">
              Capital Citadel: (0, 0)
            </span>
          </div>
        </div>

        {/* Player 2 Slot (Red Citadel) */}
        <div
          className={`p-5 rounded-2xl border space-y-3 transition-all ${
            p2
              ? 'bg-rose-950/30 border-rose-500/30'
              : 'bg-zinc-900/30 border-zinc-800 border-dashed'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
              <Crown className="w-3 h-3" />
              <span>Player 2 (Red)</span>
            </span>
            {p2?.isReady || (!isCreator && isReadyPending) ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Ready</span>
              </span>
            ) : p2 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 animate-pulse">
                <span>Not Ready</span>
              </span>
            ) : null}
          </div>

          {p2 ? (
            <div>
              <span className="font-bold text-base text-white block">{p2.user.name}</span>
              <span className="text-[11px] text-rose-400/80 font-mono">
                Capital Citadel: (5, 5)
              </span>
            </div>
          ) : (
            <div className="py-2 flex items-center gap-2 text-zinc-500 text-xs">
              <Clock className="w-4 h-4 animate-spin text-purple-400" />
              <span>Waiting for rival to join...</span>
            </div>
          )}
        </div>
      </div>

      {/* Tactical Status Banner */}
      {p2 && !isReady && (
        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center gap-2.5 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>Rival commander has entered the war room! Click <strong>Ready Up</strong> to initiate the countdown.</span>
        </div>
      )}
      {p1?.isReady && p2?.isReady && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2.5 animate-in fade-in">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Both commanders ready! Synchronizing battlefield...</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        {isCreator && onCancel && (
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold text-xs uppercase tracking-wider transition-all border border-zinc-800 flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Cancel Match</span>
          </button>
        )}

        <button
          onClick={handleReadyClick}
          disabled={!p2 || isReady || isReadyPending}
          className={`w-full sm:w-auto ml-auto px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
            isReady || isReadyPending
              ? 'bg-emerald-600 text-white cursor-default'
              : !p2
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
              : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
          }`}
        >
          {isReady ? (
            <>
              <Check className="w-4 h-4" />
              <span>Ready for Combat</span>
            </>
          ) : isReadyPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Confirming Ready...</span>
            </>
          ) : (
            <>
              <Swords className="w-4 h-4" />
              <span>Ready Up</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
