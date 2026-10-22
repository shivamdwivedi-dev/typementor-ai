import React, { useState } from 'react';
import { Swords, X, Coins, Sparkles, AlertCircle } from 'lucide-react';
import { safeFetch } from '../../utils/api';
import { useAuthStore } from '../../store/AuthStore';
import { PublicArenaMatch } from '../../types/arena';

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (match: PublicArenaMatch) => void;
  userBalance: number;
}

const STAKE_PRESETS = [0, 25, 50, 100, 250, 500];

export const CreateMatchModal: React.FC<CreateMatchModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  userBalance,
}) => {
  const { token } = useAuthStore();
  const [stake, setStake] = useState<number>(0);
  const [passageCategory, setPassageCategory] = useState<'Short' | 'Standard' | 'Long'>('Standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isColdStartError = error !== null && /waking up|timed out/i.test(error);

  const hasInsufficientBalance = stake > userBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasInsufficientBalance) {
      setError(`Insufficient Arena Points. You currently have ${userBalance} points.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const idempotencyKey = `create_match_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await safeFetch('/api/arena/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          stakeAmount: stake,
          passageCategory,
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create match.');
      }

      onCreated(data.match);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the match.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-white">
        {/* Glow ambient highlight */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Create Friendly Match</h2>
              <p className="text-xs text-zinc-400">Invite a friend to race live on the same passage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <div className="space-y-1">
                <span className="block">{error}</span>
                {isColdStartError && (
                  <span className="block text-amber-300">
                    The backend server is waking up from sleep. Please wait ~15 seconds and try again.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Stake selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Arena Points Stake</span>
              </label>
              <span className="text-xs text-zinc-400">
                Balance: <strong className="text-amber-300 font-mono">{userBalance}</strong> pts
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {STAKE_PRESETS.map((preset) => {
                const isSelected = stake === preset;
                const isAffordable = preset <= userBalance;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setStake(preset)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                        : isAffordable
                        ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        : 'bg-zinc-900/30 border-zinc-900 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    {preset === 0 ? '0 (Free)' : `${preset} pts`}
                  </button>
                );
              })}
            </div>

            {stake > 0 ? (
              <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Winner takes total pot of <strong className="text-amber-300">{stake * 2} pts</strong> ({stake} won from opponent).
              </p>
            ) : (
              <p className="text-[11px] text-zinc-400 pt-1">
                Friendly unranked match. Zero points risked or transferred.
              </p>
            )}
          </div>

          {/* Passage Length */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Passage Length
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Short', 'Standard', 'Long'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPassageCategory(cat)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                    passageCategory === cat
                      ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/25'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat} {cat === 'Short' ? '(~30w)' : cat === 'Standard' ? '(~55w)' : '(~70w)'}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Card */}
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-1.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Points Locked on Start:</span>
              <span className="font-mono text-white font-bold">{stake} pts</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Remaining Balance:</span>
              <span className={`font-mono font-bold ${hasInsufficientBalance ? 'text-red-400' : 'text-emerald-400'}`}>
                {userBalance - stake} pts
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || hasInsufficientBalance}
              className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : stake > 0 ? (
                `Create & Lock ${stake} pts`
              ) : (
                'Create Friendly Match'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
