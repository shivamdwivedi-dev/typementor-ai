import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Crown,
  Swords,
  Timer,
  ChevronRight,
  Target,
} from 'lucide-react';
import { TerritoryCell, ActiveAttackChallenge } from '../../types/conquest';

export interface IncomingAttackInfo {
  attackerUserId: string;
  attackerName: string;
  targetCellKey: string;
  targetCell: TerritoryCell;
  isMyCapital: boolean;
  defenseModifier: number;
  startedAt: number;
  charsTyped: number;
}

interface ConquestIncomingAttackAlertProps {
  attack: IncomingAttackInfo;
  activeChallenge: ActiveAttackChallenge | null;
  onDefendNow: () => void;
}

export const ConquestIncomingAttackAlert: React.FC<ConquestIncomingAttackAlertProps> = ({
  attack,
  activeChallenge,
  onDefendNow,
}) => {
  // Authoritative 75-second deadline window countdown
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const elapsed = Math.floor((Date.now() - attack.startedAt) / 1000);
    return Math.max(0, 75 - elapsed);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - attack.startedAt) / 1000);
      const remaining = Math.max(0, 75 - elapsed);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [attack.startedAt]);

  const isCapital = attack.isMyCapital || attack.targetCell.type === 'CAPITAL';
  const coords = `(${attack.targetCell.row}, ${attack.targetCell.col})`;
  const territoryTypeName = isCapital
    ? 'Capital Citadel'
    : attack.targetCell.type === 'FORTRESS'
    ? 'Fortress Bastion'
    : 'Frontline Territory';

  const timerPercent = Math.min(100, Math.max(0, (secondsLeft / 75) * 100));

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`w-full rounded-2xl border p-4 sm:p-5 shadow-2xl backdrop-blur-xl transition-all relative overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300 ${
        isCapital
          ? 'bg-rose-950/80 border-rose-500/80 text-rose-100 shadow-rose-500/20 ring-2 ring-rose-500/50'
          : 'bg-amber-950/80 border-amber-500/80 text-amber-100 shadow-amber-500/20 ring-1 ring-amber-500/40'
      }`}
    >
      {/* Background threat pulse */}
      <div
        className={`absolute -right-16 -top-16 w-44 h-44 rounded-full blur-2xl pointer-events-none ${
          isCapital ? 'bg-rose-500/20 animate-pulse' : 'bg-amber-500/20 animate-pulse'
        }`}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Side: Alert Header & Tactical Threat Info */}
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-2xl shrink-0 border ${
              isCapital
                ? 'bg-rose-500/30 text-rose-300 border-rose-500/50 animate-bounce'
                : 'bg-amber-500/30 text-amber-300 border-amber-500/50 animate-pulse'
            }`}
          >
            {isCapital ? (
              <Crown className="w-6 h-6 text-rose-300" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-amber-300" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isCapital
                    ? 'bg-rose-500/30 text-rose-200 border-rose-400/50'
                    : 'bg-amber-500/30 text-amber-200 border-amber-400/50'
                }`}
              >
                {isCapital ? 'CRITICAL CITADEL ASSAULT' : 'INCOMING ATTACK'}
              </span>

              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10 text-white">
                Target: {coords} • {territoryTypeName}
              </span>
            </div>

            <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
              <span className="text-amber-300 font-extrabold">{attack.attackerName}</span> is
              attacking your {territoryTypeName}!
            </h4>

            <p className="text-xs text-zinc-300 leading-relaxed max-w-xl">
              {activeChallenge ? (
                <>
                  You have an active attack underway on tile{' '}
                  <span className="font-mono font-bold text-purple-300">
                    {activeChallenge.targetCellKey}
                  </span>
                  . Complete your challenge now before the attacker captures your ground!
                </>
              ) : (
                <>
                  Friendly tiles cannot be typed on directly. Launch an immediate counter-assault
                  on an adjacent enemy target to pressure the attacker!
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Side: Server Telemetry & DEFEND NOW CTA */}
        <div className="w-full md:w-auto flex flex-row md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
          {/* Telemetry pill: Remaining Timer & Characters Typed */}
          <div className="flex items-center gap-3">
            {attack.charsTyped > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-300 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                <Target className="w-3.5 h-3.5 text-purple-400" />
                <span>Opponent typed:</span>
                <span className="font-bold text-amber-300">{attack.charsTyped} chars</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/50 border border-white/15 text-xs font-mono font-bold">
              <Timer
                className={`w-4 h-4 ${
                  secondsLeft <= 15 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                }`}
              />
              <span className={secondsLeft <= 15 ? 'text-rose-300 font-black' : 'text-white'}>
                {secondsLeft}s left
              </span>
            </div>
          </div>

          {/* Action CTA Button */}
          <button
            onClick={onDefendNow}
            className={`w-full md:w-auto px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
              isCapital
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black shadow-amber-500/30'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>{activeChallenge ? 'FOCUS ACTIVE COMBAT' : 'DEFEND NOW'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Countdown progress line */}
      <div className="w-full h-1 bg-black/40 rounded-full mt-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-linear ${
            isCapital ? 'bg-rose-500' : 'bg-amber-400'
          }`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>
    </div>
  );
};
