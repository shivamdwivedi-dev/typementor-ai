import React, { useState } from 'react';
import { Copy, Check, Swords, User, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { PublicArenaMatch } from '../../types/arena';

interface ArenaWaitingRoomProps {
  match: PublicArenaMatch;
  currentUserId: string;
  onCancel: () => void;
  onReady: () => void;
}

export const ArenaWaitingRoom: React.FC<ArenaWaitingRoomProps> = ({
  match,
  currentUserId,
  onCancel,
  onReady,
}) => {
  const [copied, setCopied] = useState(false);

  const isCreator = match.creatorId === currentUserId;
  const myParticipant = match.participants.find((p) => p.userId === currentUserId);
  const opponent = match.participants.find((p) => p.userId !== currentUserId);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(match.matchCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
      {/* Header card with match code */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl text-center space-y-4 shadow-2xl relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5" />
          <span>Waiting Room</span>
        </div>

        <div>
          <p className="text-xs text-zinc-400 font-semibold mb-1">Share this match code with your friend:</p>
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-zinc-950/80 border border-zinc-700/80 shadow-inner group">
            <span className="font-mono text-3xl sm:text-4xl font-black text-amber-400 tracking-[0.25em]">
              {match.matchCode}
            </span>
            <button
              onClick={handleCopyCode}
              title="Copy Match Code"
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          {copied && (
            <p className="text-xs text-emerald-400 font-bold mt-1.5 animate-in fade-in">
              Code copied to clipboard!
            </p>
          )}
        </div>

        {/* Stake pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700 text-xs text-zinc-300 font-medium">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          {match.stakeAmount > 0 ? (
            <span>
              Wagered Stake: <strong className="text-amber-300">{match.stakeAmount} Arena Points</strong> (Pot: {match.stakeAmount * 2} pts)
            </span>
          ) : (
            <span>Friendly Match • 0 Points Wagered</span>
          )}
        </div>
      </div>

      {/* Players head-to-head status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Seat 1 (Creator) */}
        <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-md flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center text-xl font-bold text-blue-400 shadow-lg">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">
              {match.participants[0]?.name || 'Creator'}
            </h3>
            <p className="text-xs text-zinc-400 font-semibold">Seat 1 (Host)</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ✓ Ready
          </span>
        </div>

        {/* Seat 2 (Challenger) */}
        <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-md flex flex-col items-center text-center space-y-3">
          {opponent || (!isCreator && myParticipant) ? (
            <>
              <div className="w-16 h-16 rounded-full bg-indigo-600/20 border-2 border-indigo-500/40 flex items-center justify-center text-xl font-bold text-indigo-400 shadow-lg">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  {opponent?.name || myParticipant?.name || 'Challenger'}
                </h3>
                <p className="text-xs text-zinc-400 font-semibold">Seat 2 (Challenger)</p>
              </div>
              {match.participants[1]?.isReady ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ✓ Ready
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                  Waiting for Ready...
                </span>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-4 space-y-3">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center text-zinc-600">
                <Swords className="w-6 h-6 animate-pulse" />
              </div>
              <p className="text-xs text-zinc-400 font-medium">Waiting for opponent to join...</p>
            </div>
          )}
        </div>
      </div>

      {/* Action controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        {isCreator ? (
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Cancel Match & Refund Stake</span>
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 font-bold text-xs transition-colors"
          >
            Leave Match
          </button>
        )}

        {/* Ready button for player 2 */}
        {!isCreator && myParticipant && !myParticipant.isReady && (
          <button
            onClick={onReady}
            className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            <span>I'm Ready!</span>
          </button>
        )}
      </div>
    </div>
  );
};
