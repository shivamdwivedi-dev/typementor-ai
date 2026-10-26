import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Crown, Coins, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/AuthStore';
import { safeFetch } from '../utils/api';

export const ArenaHub: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const [balance, setBalance] = useState<number>(0);
  const [hasActiveMatch, setHasActiveMatch] = useState<boolean>(false);
  const [activeMatchCode, setActiveMatchCode] = useState<string | null>(null);
  const [hasActiveConquest, setHasActiveConquest] = useState<boolean>(false);
  const [activeConquestCode, setActiveConquestCode] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    // Fetch user balance
    safeFetch('/api/arena/balance', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.balance === 'number') {
          setBalance(data.balance);
        }
      })
      .catch((err) => console.warn('[ArenaHub] Balance check error:', err));

    // Check if user is in an active or waiting Arena Duel match
    safeFetch('/api/arena/active', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.match && data.match.status !== 'FINISHED' && data.match.status !== 'CANCELLED') {
          setHasActiveMatch(true);
          setActiveMatchCode(data.match.matchCode || null);
        }
      })
      .catch((err) => console.warn('[ArenaHub] Active duel check error:', err));

    // Check if user is in an active or waiting Word Conquest match
    safeFetch('/api/conquest/active', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.match && data.match.status !== 'FINISHED' && data.match.status !== 'CANCELLED') {
          setHasActiveConquest(true);
          setActiveConquestCode(data.match.matchCode || null);
        }
      })
      .catch((err) => console.warn('[ArenaHub] Active conquest check error:', err));
  }, [token]);

  return (
    <div className="max-w-5xl mx-auto w-full py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-300">
      {/* Active Arena Duel Banner */}
      {hasActiveMatch && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-200">
                You have an active duel in progress! {activeMatchCode ? `(${activeMatchCode})` : ''}
              </p>
              <p className="text-xs text-amber-400/80">
                Your opponent or waiting room is waiting for you.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/arena/duel')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <span>Resume Duel</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Word Conquest Banner */}
      {hasActiveConquest && (
        <div className="p-4 sm:p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-purple-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
              <Crown className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-purple-200">
                You have an active Word Conquest battle! {activeConquestCode ? `(${activeConquestCode})` : ''}
              </p>
              <p className="text-xs text-purple-400/80">
                The 6×6 realm awaits your command.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/arena/conquest/play')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-2"
          >
            <span>Resume Conquest</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative p-8 sm:p-12 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multiplayer Game Hub</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center gap-3">
              Typing Arena
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
              Choose your battlefield. Challenge friends to live head-to-head typing duels or expand your empire in tactical territory conquest.
            </p>
          </div>

          {/* User Arena Balance Card */}
          <div className="w-full md:w-auto p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 shadow-inner flex md:flex-col items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
                  Your Balance
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-black text-amber-300">
                  {balance} <span className="text-xs font-sans text-amber-400/80">pts</span>
                </span>
              </div>
            </div>
            <div className="hidden md:block text-[11px] text-zinc-400 text-center font-medium">
              Ranked Points: <span className="text-white font-semibold">{user?.level ? `Level ${user.level}` : 'Rookie'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Selection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Card 1: Arena Duel */}
        <div className="relative group rounded-3xl bg-zinc-900/50 border border-zinc-800 hover:border-blue-500/50 transition-all duration-300 p-6 sm:p-8 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 backdrop-blur-sm overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />

          <div className="space-y-5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="p-3.5 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30 group-hover:scale-105 transition-transform">
                <Swords className="w-7 h-7" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Available Now
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 group-hover:text-blue-300 transition-colors">
                Arena Duel
              </h2>
              <p className="text-xs text-blue-400/90 font-semibold uppercase tracking-wider mt-1">
                Head-to-Head Typing Battle
              </p>
            </div>

            <p className="text-sm text-zinc-400 leading-relaxed">
              Challenge another player in a live typing duel. Race through the same server-validated passage simultaneously, track opponent progress in real time, and claim the match stake.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-left">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Format</span>
                <span className="text-xs font-bold text-zinc-200">1v1 Real-Time Race</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-left">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Match Stake</span>
                <span className="text-xs font-bold text-amber-400">0 – 500 Arena Points</span>
              </div>
            </div>
          </div>

          <div className="pt-6 relative z-10">
            <button
              onClick={() => navigate('/arena/duel')}
              className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 group-hover:translate-x-0.5"
            >
              <span>Play Arena Duel</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Card 2: Word Conquest */}
        <div className="relative group rounded-3xl bg-zinc-900/50 border border-zinc-800 hover:border-purple-500/50 transition-all duration-300 p-6 sm:p-8 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 backdrop-blur-sm overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />

          <div className="space-y-5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="p-3.5 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 group-hover:scale-105 transition-transform">
                <Crown className="w-7 h-7" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                Live Playable
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 group-hover:text-purple-300 transition-colors">
                Word Conquest
              </h2>
              <p className="text-xs text-purple-400/90 font-semibold uppercase tracking-wider mt-1">
                Multiplayer Territory Strategy
              </p>
            </div>

            <p className="text-sm text-zinc-400 leading-relaxed">
              Expand your territory, attack enemy regions, and conquer a 6×6 map through competitive typing challenges. Storm defensive fortresses and capture your opponent's capital.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-left">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Battlefield</span>
                <span className="text-xs font-bold text-zinc-200">6×6 Tactical Grid</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-left">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Victory Goal</span>
                <span className="text-xs font-bold text-purple-300">Capital Capture</span>
              </div>
            </div>
          </div>

          <div className="pt-6 relative z-10 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => navigate('/arena/conquest/play')}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 group-hover:translate-x-0.5"
            >
              <span>Play Word Conquest</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/arena/conquest')}
              className="py-3.5 px-4 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 text-purple-300 border border-purple-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
              title="View Rules & Blueprint"
            >
              <span>Rules</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArenaHub;
