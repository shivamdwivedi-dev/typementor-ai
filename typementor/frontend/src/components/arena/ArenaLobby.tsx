import React, { useState } from 'react';
import {
  Swords,
  Coins,
  Plus,
  KeyRound,
  History,
  Users,
  Info,
  ArrowRight,
} from 'lucide-react';
import { PublicArenaMatch, MatchHistoryItem } from '../../types/arena';

interface ArenaLobbyProps {
  userBalance: number;
  onOpenCreate: () => void;
  onOpenJoin: () => void;
  onJoinOpenMatch: (matchCode: string) => void;
  history: MatchHistoryItem[];
  openMatches: PublicArenaMatch[];
  isLoadingHistory: boolean;
  isLoadingOpenMatches: boolean;
}

export const ArenaLobby: React.FC<ArenaLobbyProps> = ({
  userBalance,
  onOpenCreate,
  onOpenJoin,
  onJoinOpenMatch,
  history,
  openMatches,
  isLoadingHistory,
  isLoadingOpenMatches,
}) => {
  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
  const [showInfoModal, setShowInfoModal] = useState(false);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
      {/* Lobby Hero Header */}
      <div className="relative p-6 sm:p-10 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Swords className="w-3.5 h-3.5" />
              <span>Multiplayer Typing Arena</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              Friendly Arena
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-lg leading-relaxed">
              Challenge friends to real-time head-to-head typing matches. Race on the exact same server-validated passage simultaneously with live opponent progress.
            </p>
          </div>

          {/* Balance card */}
          <div className="w-full md:w-auto p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex md:flex-col items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
                  Arena Balance
                </span>
                <span className="font-mono text-2xl font-black text-amber-300">
                  {userBalance} <span className="text-xs font-sans text-amber-400/80">pts</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowInfoModal(true)}
              className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-zinc-500" />
              <span>How Points Work</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 pt-6 border-t border-zinc-800/80 mt-6">
          <button
            onClick={onOpenCreate}
            className="flex-1 sm:flex-none py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Match</span>
          </button>

          <button
            onClick={onOpenJoin}
            className="flex-1 sm:flex-none py-3 px-6 rounded-2xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Join with Code</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
          <button
            onClick={() => setActiveTab('open')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'open'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Open Waiting Rooms ({openMatches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Match History</span>
          </button>
        </div>

        {/* Tab Content: Open Waiting Matches */}
        {activeTab === 'open' && (
          <div className="space-y-3">
            {isLoadingOpenMatches ? (
              <div className="p-8 text-center text-xs text-zinc-500">Loading open matches...</div>
            ) : openMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {openMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {m.participants[0]?.name || 'Player'}
                        </span>
                        <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                          {m.matchCode}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        {m.passageTitle} • {m.passageWordCount} words
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {m.stakeAmount > 0 ? (
                          <span className="text-amber-400 font-medium">Stake: {m.stakeAmount} pts</span>
                        ) : (
                          'Friendly • 0 pts'
                        )}
                      </p>
                    </div>

                    <button
                      onClick={() => onJoinOpenMatch(m.matchCode)}
                      className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 flex-shrink-0"
                    >
                      <span>Join</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-zinc-900/20 border border-zinc-800/80 space-y-3">
                <Swords className="w-8 h-8 text-zinc-600 mx-auto" />
                <h3 className="font-bold text-white text-sm">No Waiting Rooms Available</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Be the first to create a match and share your code with a friend!
                </p>
                <button
                  onClick={onOpenCreate}
                  className="py-2 px-4 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-xs hover:bg-blue-600 hover:text-white transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Match
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {isLoadingHistory ? (
              <div className="p-8 text-center text-xs text-zinc-500">Loading match history...</div>
            ) : history.length > 0 ? (
              <div className="space-y-2">
                {history.map((h) => {
                  const isWin = h.myOutcome === 'WIN';
                  const isTie = h.myOutcome === 'TIE';
                  return (
                    <div
                      key={h.id}
                      className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 rounded-xl font-bold uppercase tracking-wider text-[10px] border ${
                            isWin
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isTie
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}
                        >
                          {h.myOutcome}
                        </span>

                        <div>
                          <p className="font-bold text-white">vs {h.opponentName}</p>
                          <p className="text-zinc-400 text-[11px]">{h.passageTitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 font-mono text-zinc-300">
                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase block font-sans">Speed</span>
                          <span className="font-bold text-white">{h.myWpm} WPM</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase block font-sans">Accuracy</span>
                          <span className="font-bold text-emerald-400">{h.myAccuracy}%</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase block font-sans">Points</span>
                          <span
                            className={`font-bold ${
                              h.pointsDelta > 0
                                ? 'text-emerald-400'
                                : h.pointsDelta < 0
                                ? 'text-red-400'
                                : 'text-zinc-400'
                            }`}
                          >
                            {h.pointsDelta > 0 ? `+${h.pointsDelta}` : h.pointsDelta}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-zinc-900/20 border border-zinc-800/80 space-y-2">
                <History className="w-8 h-8 text-zinc-600 mx-auto" />
                <h3 className="font-bold text-white text-sm">No Matches Played Yet</h3>
                <p className="text-xs text-zinc-500">Your completed match records will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl text-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Coins className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold">How Arena Points Work</h2>
            </div>

            <div className="space-y-3 text-xs text-zinc-400 leading-relaxed">
              <p>
                <strong className="text-white">Friendly Friendly Stakes:</strong> Arena Points are purely virtual gamification tokens designed to make friendly typing matches between developers exciting.
              </p>
              <p>
                <strong className="text-white">Zero Real Currency:</strong> Arena Points have no real-world monetary value, cannot be purchased, and cannot be traded for cash.
              </p>
              <p>
                <strong className="text-white">Zero-Stake Matches:</strong> You can always create or join 0-point matches for completely unranked, wager-free fun!
              </p>
              <p>
                <strong className="text-white">XP Untouched:</strong> Arena Points are completely separate from your main TypeMentor XP, lesson progress, and streaks.
              </p>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
