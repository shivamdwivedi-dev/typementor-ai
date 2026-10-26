import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Swords, Shield, Flag, Compass, ArrowLeft, Sparkles } from 'lucide-react';

export const ConquestPreview: React.FC = () => {
  const navigate = useNavigate();

  // 6x6 Grid preview data
  // Key fortresses at (1,4), (4,1), (2,3), (3,2)
  const isFortress = (r: number, c: number) =>
    (r === 1 && c === 4) || (r === 4 && c === 1) || (r === 2 && c === 3) || (r === 3 && c === 2);

  return (
    <div className="max-w-5xl mx-auto w-full py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-300">
      {/* Navigation breadcrumb */}
      <div>
        <button
          onClick={() => navigate('/arena')}
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Arena Hub</span>
        </button>
      </div>

      {/* Hero Header */}
      <div className="relative p-8 sm:p-12 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Game Mode Preview</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center gap-3">
            Word Conquest
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed">
            A real-time multiplayer territory strategy game where speed and precision build empires. Claim neutral regions, breach enemy defensive fortresses, and storm the opponent's capital through typing challenges.
          </p>

          <div className="pt-2 flex flex-wrap gap-3 items-center">
            <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold">
              6×6 Tactical Grid
            </span>
            <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
              2-Player Competitive
            </span>
            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              Server-Validated Combats
            </span>

            <button
              onClick={() => navigate('/arena/conquest/play')}
              className="ml-auto px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-purple-600/30 flex items-center gap-1.5"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Launch Live Battle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive 6x6 Map Architecture Preview */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-purple-400" />
              <span>Tactical Map Blueprint</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Each match generates a balanced, symmetric 36-territory battlefield.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
              <span className="w-3 h-3 rounded bg-blue-600 border border-blue-400 inline-block" />
              <span>Player 1 Capital (0,0)</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-400 font-semibold">
              <span className="w-3 h-3 rounded bg-red-600 border border-red-400 inline-block" />
              <span>Player 2 Capital (5,5)</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500 inline-block" />
              <span>Fortress</span>
            </div>
          </div>
        </div>

        {/* 6x6 Visual Grid */}
        <div className="max-w-md mx-auto aspect-square p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 grid grid-cols-6 gap-2 shadow-2xl">
          {Array.from({ length: 36 }).map((_, idx) => {
            const r = Math.floor(idx / 6);
            const c = idx % 6;
            const isP1 = r === 0 && c === 0;
            const isP2 = r === 5 && c === 5;
            const isFort = isFortress(r, c);

            return (
              <div
                key={idx}
                className={`rounded-xl flex flex-col items-center justify-center text-[10px] font-bold border transition-all select-none ${
                  isP1
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-md shadow-blue-500/20'
                    : isP2
                    ? 'bg-red-600/30 border-red-500 text-red-300 shadow-md shadow-red-500/20'
                    : isFort
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-600 hover:border-zinc-700'
                }`}
              >
                {isP1 ? (
                  <Crown className="w-4 h-4 text-blue-400 mb-0.5" />
                ) : isP2 ? (
                  <Crown className="w-4 h-4 text-red-400 mb-0.5" />
                ) : isFort ? (
                  <Shield className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                ) : (
                  <span className="text-[9px] opacity-40">{r},{c}</span>
                )}
                <span className="text-[8px] uppercase tracking-tighter">
                  {isP1 ? 'P1' : isP2 ? 'P2' : isFort ? 'Fort' : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rules Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
          <div className="p-2.5 w-fit rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">1. Adjacency Rule</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            You can only launch an attack against neutral or enemy cells directly adjacent (North, South, East, West) to territories you currently hold.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
          <div className="p-2.5 w-fit rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">2. Typing Challenges</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Neutral territories trigger quick 15-word bursts. Fortresses demand 40-word technical code snippets. The server validates every keystroke.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
          <div className="p-2.5 w-fit rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Flag className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">3. Capital Victory</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Storm the enemy capital or claim the majority of the 36 territories before the match timer expires to secure match victory and glory.
          </p>
        </div>
      </div>

      {/* Call to action */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-900/30 via-zinc-900/50 to-purple-900/30 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-bold text-white">Ready to test your typing skills right now?</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Play Word Conquest to conquer the tactical 6×6 realm, or jump into a live head-to-head Arena Duel.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/arena/conquest/play')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            <span>Play Word Conquest</span>
          </button>
          <button
            onClick={() => navigate('/arena/duel')}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-blue-300 border border-blue-500/30 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <Swords className="w-4 h-4" />
            <span>Play Arena Duel</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConquestPreview;
