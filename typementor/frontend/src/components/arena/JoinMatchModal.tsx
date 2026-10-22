import React, { useState } from 'react';
import { X, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';
import { safeFetch } from '../../utils/api';
import { useAuthStore } from '../../store/AuthStore';
import { PublicArenaMatch } from '../../types/arena';

interface JoinMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoined: (match: PublicArenaMatch) => void;
  userBalance: number;
}

export const JoinMatchModal: React.FC<JoinMatchModalProps> = ({
  isOpen,
  onClose,
  onJoined,
}) => {
  const { token } = useAuthStore();
  const [matchCode, setMatchCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isColdStartError = error !== null && /waking up|timed out/i.test(error);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = matchCode.trim().toUpperCase();

    if (!cleanCode || cleanCode.length < 5) {
      setError('Please enter a valid 6-character match code.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const idempotencyKey = `join_match_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await safeFetch('/api/arena/matches/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ matchCode: cleanCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join match.');
      }

      onJoined(data.match);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Unable to join match.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-white">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Join Arena Match</h2>
              <p className="text-xs text-zinc-400">Enter your opponent's 6-character code</p>
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

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              6-Character Match Code
            </label>
            <input
              type="text"
              autoFocus
              maxLength={6}
              value={matchCode}
              onChange={(e) => setMatchCode(e.target.value.toUpperCase())}
              placeholder="e.g. ARN782"
              className="w-full text-center tracking-[0.3em] font-mono text-2xl font-black py-4 px-4 bg-zinc-900/80 border border-zinc-800 focus:border-amber-500 rounded-2xl text-amber-400 outline-none transition-colors"
            />
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
              disabled={isSubmitting || matchCode.trim().length < 5}
              className="flex-1 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Join Match</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
