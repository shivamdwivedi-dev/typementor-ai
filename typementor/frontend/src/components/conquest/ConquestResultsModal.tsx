import React from 'react';
import { Trophy, Skull, RotateCcw } from 'lucide-react';
import { PublicConquestMatch } from '../../types/conquest';

interface ConquestResultsModalProps {
  match: PublicConquestMatch;
  currentUserId: string;
  reason?: string | null;
  onReturnToHub: () => void;
  onNewMatch: () => void;
}

export const ConquestResultsModal: React.FC<ConquestResultsModalProps> = ({
  match,
  currentUserId,
  reason,
  onReturnToHub,
  onNewMatch,
}) => {
  const isWinner = match.winnerId === currentUserId;
  const p1 = match.participants.find((p) => p.seat === 1);
  const p2 = match.participants.find((p) => p.seat === 2);

  const p1Count = p1?.territoriesCount ?? 1;
  const p2Count = p2?.territoriesCount ?? 1;

  let reasonDescription = 'Capital Citadel Captured!';
  if (reason === 'FORFEIT_DISCONNECT') {
    reasonDescription = 'Opponent connection forfeited after 30-second disconnect timeout.';
  } else if (reason === 'CAPITAL_CAPTURED') {
    reasonDescription = 'The enemy Capital Citadel has fallen to typing supremacy!';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden text-center">
        {/* Glow backdrop */}
        <div
          className={`absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
            isWinner ? 'bg-amber-500/20' : 'bg-rose-500/20'
          }`}
        />

        {/* Hero Result Icon */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div
            className={`p-4 rounded-3xl border shadow-xl ${
              isWinner
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-amber-500/10'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-500/10'
            }`}
          >
            {isWinner ? <Trophy className="w-12 h-12 animate-bounce" /> : <Skull className="w-12 h-12" />}
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isWinner ? 'VICTORY' : 'DEFEAT'}
          </h2>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-sm">
            {reasonDescription}
          </p>
        </div>

        {/* Territory Battlefield Breakdown */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3 relative z-10">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">
            Final Realm Partition (36 Territories)
          </span>

          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">{p1?.user.name}</span>
                <span className="text-[10px] text-blue-400 font-mono">Blue Citadel</span>
              </div>
              <span className="text-xl font-black font-mono text-blue-300">
                {p1Count}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">{p2?.user.name}</span>
                <span className="text-[10px] text-rose-400 font-mono">Red Citadel</span>
              </div>
              <span className="text-xl font-black font-mono text-rose-300">
                {p2Count}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 relative z-10">
          <button
            onClick={onReturnToHub}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <span>Arena Hub</span>
          </button>

          <button
            onClick={onNewMatch}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
