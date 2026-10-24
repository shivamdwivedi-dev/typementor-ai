import React from 'react';
import { Trophy, Swords, RotateCcw, Home, Sparkles } from 'lucide-react';
import { PublicArenaMatch } from '../../types/arena';

interface ArenaResultsProps {
  match: PublicArenaMatch;
  currentUserId: string;
  opponentProgress?: {
    userId: string;
    progressPercent: number;
    wpm: number;
    accuracy: number;
    charsTyped: number;
  } | null;
  onRematch: () => void;
  onReturnToLobby: () => void;
}

export const ArenaResults: React.FC<ArenaResultsProps> = ({
  match,
  currentUserId,
  opponentProgress,
  onRematch,
  onReturnToLobby,
}) => {
  const isWinner = match.winnerId === currentUserId;
  const isTie = match.isTie;
  const isLoser = !isTie && match.winnerId && match.winnerId !== currentUserId;

  const myParticipant = match.participants.find((p) => p.userId === currentUserId);
  const opponent = match.participants.find((p) => p.userId !== currentUserId);

  const myWpm = myParticipant?.wpm ?? 0;
  const oppWpm = (opponent?.wpm && opponent.wpm > 0)
    ? opponent.wpm
    : (opponentProgress?.wpm ?? 0);

  const myAccuracy = myParticipant?.accuracy ?? 0;
  const oppAccuracy = (opponent?.accuracy && opponent.accuracy > 0)
    ? opponent.accuracy
    : (opponentProgress?.accuracy ?? 0);

  const myTimeDisplay = myParticipant?.completionTimeMs
    ? `${(myParticipant.completionTimeMs / 1000).toFixed(1)}s`
    : myParticipant?.progressPercent === 100
    ? 'Finished'
    : myParticipant?.progressPercent && myParticipant.progressPercent > 0
    ? `${myParticipant.progressPercent}% Typed`
    : 'Timed Out';

  const oppTimeDisplay = opponent?.completionTimeMs
    ? `${(opponent.completionTimeMs / 1000).toFixed(1)}s`
    : (opponent?.progressPercent === 100 || opponentProgress?.progressPercent === 100)
    ? 'Finished'
    : (opponent?.progressPercent || opponentProgress?.progressPercent)
    ? `${opponent?.progressPercent || opponentProgress?.progressPercent}% Typed`
    : 'Timed Out';

  const pointsDelta = isWinner
    ? match.stakeAmount
    : isLoser
    ? -match.stakeAmount
    : 0;

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 animate-in zoom-in-95 duration-300">
      {/* Celebration Banner */}
      <div className={`p-8 rounded-3xl border text-center space-y-4 shadow-2xl relative overflow-hidden backdrop-blur-xl ${
        isWinner
          ? 'bg-gradient-to-b from-amber-500/15 via-zinc-900/80 to-zinc-950 border-amber-500/30'
          : isTie
          ? 'bg-gradient-to-b from-blue-500/15 via-zinc-900/80 to-zinc-950 border-blue-500/30'
          : 'bg-gradient-to-b from-zinc-800/30 via-zinc-900/80 to-zinc-950 border-zinc-800'
      }`}>
        <div className="flex justify-center">
          {isWinner ? (
            <div className="p-4 rounded-3xl bg-amber-500/20 border-2 border-amber-400 text-amber-300 shadow-xl shadow-amber-500/30 animate-bounce">
              <Trophy className="w-12 h-12" />
            </div>
          ) : isTie ? (
            <div className="p-4 rounded-3xl bg-blue-500/20 border-2 border-blue-400 text-blue-300 shadow-xl">
              <Swords className="w-12 h-12" />
            </div>
          ) : (
            <div className="p-4 rounded-3xl bg-zinc-800/80 border-2 border-zinc-700 text-zinc-400 shadow-xl">
              <Swords className="w-12 h-12" />
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isWinner ? 'Victory!' : isTie ? 'Stalemate / Draw' : 'Defeat'}
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            {isWinner
              ? 'Flawless cadence and lightning speed won you this match!'
              : isTie
              ? 'Both typists reached the exact same progress at deadline.'
              : 'Great effort! Re-align your home row and challenge again.'}
          </p>
        </div>

        {/* Points Transferred Card */}
        {match.stakeAmount > 0 ? (
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-zinc-300">
              Settlement:{' '}
              <strong className={`font-mono text-sm ${pointsDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pointsDelta > 0 ? `+${pointsDelta}` : pointsDelta} Arena Points
              </strong>
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-800/60 border border-zinc-700/60 text-xs text-zinc-400 font-medium">
            Friendly Unranked Match (0 points transferred)
          </div>
        )}
      </div>

      {/* Head-to-Head Stats Comparison Table */}
      <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-md shadow-2xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Head-to-Head Performance
        </h3>

        <div className="grid grid-cols-3 gap-2 py-2 border-b border-zinc-800 text-xs font-bold text-zinc-400 text-center">
          <span className="text-left text-blue-400">{myParticipant?.name || 'You'}</span>
          <span className="text-zinc-500 uppercase">Metric</span>
          <span className="text-right text-indigo-400">{opponent?.name || 'Opponent'}</span>
        </div>

        <div className="space-y-3 font-mono text-sm">
          <div className="grid grid-cols-3 gap-2 py-1.5 text-center items-center">
            <span className="text-left font-bold text-white text-base">{myWpm}</span>
            <span className="text-xs text-zinc-400 font-sans font-semibold">Speed (WPM)</span>
            <span className="text-right font-bold text-white text-base">{oppWpm}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1.5 text-center items-center">
            <span className="text-left font-bold text-emerald-400">{myAccuracy}%</span>
            <span className="text-xs text-zinc-400 font-sans font-semibold">Accuracy</span>
            <span className="text-right font-bold text-emerald-400">{oppAccuracy}%</span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1.5 text-center items-center">
            <span className="text-left text-zinc-300">
              {myTimeDisplay}
            </span>
            <span className="text-xs text-zinc-400 font-sans font-semibold">Time</span>
            <span className="text-right text-zinc-300">
              {oppTimeDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          onClick={onReturnToLobby}
          className="w-full sm:flex-1 py-3 px-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Return to Arena Lobby</span>
        </button>

        <button
          onClick={onRematch}
          className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Rematch</span>
        </button>
      </div>
    </div>
  );
};
