import React, { useState } from 'react';
import { Swords, Plus, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';

interface ConquestLobbyProps {
  onCreateMatch: () => void;
  onJoinMatch: (matchCode: string) => void;
  onOpenTutorial?: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

export const ConquestLobby: React.FC<ConquestLobbyProps> = ({
  onCreateMatch,
  onJoinMatch,
  onOpenTutorial,
  isSubmitting = false,
  error,
}) => {
  const [matchCodeInput, setMatchCodeInput] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (matchCodeInput.trim().length >= 4) {
      onJoinMatch(matchCodeInput.trim().toUpperCase());
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="relative p-8 sm:p-12 rounded-3xl bg-zinc-950/90 border border-purple-500/30 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Turn-Free Live Warfare</span>
            </div>

            {onOpenTutorial && (
              <button
                type="button"
                onClick={onOpenTutorial}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs font-bold transition-all shadow-sm"
              >
                <HelpCircle className="w-4 h-4 text-purple-400" />
                <span>How to Play (Interactive Tutorial)</span>
              </button>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center gap-3">
            Word Conquest Arena
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed">
            Wage territorial warfare on a 6×6 battlefield. Type faster and more accurately to claim unclaimed lands, conquer defensive bastions, and capture your opponent's Citadel.
          </p>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Create Match */}
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-purple-500/50 transition-all flex flex-col justify-between space-y-6 shadow-xl backdrop-blur-sm group">
          <div className="space-y-4">
            <div className="p-3.5 w-fit rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Plus className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Host New Battle</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Generate a fresh 36-territory map with balanced fortresses and receive a 6-letter match invite code.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>Player 1 Assignment:</span>
                <span className="font-bold text-blue-400">Blue Citadel (0,0)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Format:</span>
                <span className="font-bold text-white">Live Multiplayer Race</span>
              </div>
            </div>
          </div>

          <button
            onClick={onCreateMatch}
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
          >
            <span>{isSubmitting ? 'Generating Realm...' : 'Create Match'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 2: Join Match */}
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-blue-500/50 transition-all flex flex-col justify-between space-y-6 shadow-xl backdrop-blur-sm group">
          <div className="space-y-4">
            <div className="p-3.5 w-fit rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <Swords className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Join Existing Match</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Enter your rival's 6-letter code to take command of the Red Citadel (5,5).
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-1">
                  Match Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={matchCodeInput}
                  onChange={(e) => setMatchCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. CQ7A92"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-500 focus:outline-none font-mono text-center tracking-widest text-lg font-black text-blue-300 uppercase placeholder:text-zinc-600"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || matchCodeInput.trim().length < 4}
                className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Joining Battle...' : 'Join as Challenger'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
