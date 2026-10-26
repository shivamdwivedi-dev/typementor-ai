import React from 'react';
import {
  Crown,
  Shield,
  Crosshair,
  AlertTriangle,
  Info,
  Swords,
  HelpCircle,
  Target,
} from 'lucide-react';
import { TerritoryCell, PlayerSlot, ActiveAttackChallenge } from '../../types/conquest';

interface ConquestLegendProps {
  myPlayerSlot: PlayerSlot | null;
  selectedCell: TerritoryCell | null;
  candidateCellKeys: Set<string>;
  activeChallenge: ActiveAttackChallenge | null;
  opponentAttackingCellKey: string | null;
  onOpenTutorial: () => void;
}

export const ConquestLegend: React.FC<ConquestLegendProps> = ({
  myPlayerSlot,
  selectedCell,
  candidateCellKeys,
  activeChallenge,
  opponentAttackingCellKey,
  onOpenTutorial,
}) => {
  const isP1 = myPlayerSlot === 1;

  // Contextual Guidance determination for inspected cell
  const getContextualGuidance = () => {
    if (!selectedCell) {
      if (candidateCellKeys.size === 0 && !activeChallenge) {
        return {
          type: 'empty',
          badge: 'NO LEGAL TARGETS',
          title: 'No Legal Moves Available',
          desc: 'You have no candidate attack targets currently adjacent to your controlled borders. Await ongoing combat resolution or expand from remaining borders.',
        };
      }
      return {
        type: 'idle',
        badge: 'SELECT TILE',
        title: 'Click Any Territory to Inspect',
        desc: 'Select any cell on the tactical grid to inspect its coordinates, owner, defense bonus, difficulty tier, and combat eligibility.',
      };
    }

    const cellKey = `r${selectedCell.row}_c${selectedCell.col}`;
    const isCandidate = candidateCellKeys.has(cellKey);
    const isMine = myPlayerSlot !== null && selectedCell.owner === myPlayerSlot;
    const isEnemy = selectedCell.owner !== null && selectedCell.owner !== myPlayerSlot;
    const isFortress = selectedCell.type === 'FORTRESS';
    const isCapital = selectedCell.type === 'CAPITAL';
    const isBeingAttackedByMe = activeChallenge?.targetCellKey === cellKey;
    const isUnderOpponentAttack = opponentAttackingCellKey === cellKey;

    // 1. Current friendly attack in progress
    if (isBeingAttackedByMe) {
      return {
        type: 'active',
        badge: 'ASSAULT IN FLIGHT',
        title: `Your Active Assault: (${selectedCell.row}, ${selectedCell.col})`,
        desc: 'You are currently attacking this territory. Complete your typing passage in the combat drawer above to capture it!',
      };
    }

    // 2. Opponent attack on friendly territory
    if (isUnderOpponentAttack && isMine) {
      return {
        type: 'threat',
        badge: isCapital ? 'CITADEL UNDER SIEGE' : 'TERRITORY AT RISK',
        title: `⚠️ Your Territory Under Assault! (${selectedCell.row}, ${selectedCell.col})`,
        desc: isCapital
          ? 'CRITICAL ALERT: Your Capital Citadel is under enemy siege! Complete your active combat or counter-attack immediately!'
          : 'Your opponent is currently typing to capture this territory. Defend by completing your active assault or counter-attacking!',
      };
    }

    // 3. Opponent attack on neutral / contested territory
    if (isUnderOpponentAttack && !isMine) {
      return {
        type: 'contested',
        badge: 'OPPONENT CONTESTING',
        title: `Contested Neutral Land (${selectedCell.row}, ${selectedCell.col})`,
        desc: 'Your rival is currently typing to claim this territory. If adjacent, you can race them to capture it first!',
      };
    }

    // 4. Friendly territory
    if (isMine) {
      if (isCapital) {
        return {
          type: 'friendly',
          badge: 'YOUR CITADEL',
          title: `Your Capital Citadel (${selectedCell.row}, ${selectedCell.col})`,
          desc: 'Your starting headquarters. Defend this citadel at all costs — if the enemy breaches and captures it, you lose the match.',
        };
      }
      return {
        type: 'friendly',
        badge: 'FRIENDLY GROUND',
        title: `Friendly Controlled Territory (${selectedCell.row}, ${selectedCell.col})`,
        desc: 'Controlled by your faction. Server rules forbid attacking friendly tiles. Expand outward into adjacent neutral or hostile territory.',
      };
    }

    // 5. Legal attack target
    if (isCandidate) {
      if (isCapital) {
        return {
          type: 'objective',
          badge: 'FINAL OBJECTIVE • EXPERT (97% ACC)',
          title: `Enemy Capital Citadel! (${selectedCell.row}, ${selectedCell.col})`,
          desc: 'FINAL OBJECTIVE: Legal target! Click to launch Citadel Assault challenge (+5 defense bonus, 97% accuracy required). Capturing it wins the match!',
        };
      }
      if (isFortress) {
        return {
          type: 'legal',
          badge: 'LEGAL TARGET • MEDIUM (+2 DEF, 93% ACC)',
          title: `Neutral Fortress Bastion (${selectedCell.row}, ${selectedCell.col})`,
          desc: 'Legal Target: Fortress bastion with +2 defense bonus (Medium difficulty, 93% accuracy). Capturing fortresses reinforces your frontlines.',
        };
      }
      if (isEnemy) {
        return {
          type: 'legal',
          badge: 'LEGAL TARGET • HARD (95% ACC)',
          title: `Hostile Territory (${selectedCell.row}, ${selectedCell.col}) — Held by P${selectedCell.owner}`,
          desc: 'Legal Target: Enemy-held territory (Hard difficulty, 95% accuracy). Click to launch a reconquest challenge and reclaim the land!',
        };
      }
      return {
        type: 'legal',
        badge: 'LEGAL TARGET • EASY (90% ACC)',
        title: `Unclaimed Neutral Land (${selectedCell.row}, ${selectedCell.col})`,
        desc: 'Legal Target: Unclaimed frontier tile (Easy difficulty, 90% accuracy). Click to launch challenge and expand your borders.',
      };
    }

    // 6. Out of range (Not a legal target)
    if (isCapital) {
      return {
        type: 'blocked',
        badge: 'OUT OF RANGE • FINAL OBJECTIVE',
        title: `Enemy Capital Citadel (${selectedCell.row}, ${selectedCell.col})`,
        desc: 'Final Objective: Out of range right now. In Word Conquest, you can only attack territories sharing an orthogonal edge (North, South, East, West) with your land.',
      };
    }

    if (isFortress) {
      return {
        type: 'blocked',
        badge: 'OUT OF RANGE • FORTRESS',
        title: `Fortress Bastion (${selectedCell.row}, ${selectedCell.col})`,
        desc: 'Out of range right now. You must advance through adjacent territories to connect to this fortress before you can storm it.',
      };
    }

    return {
      type: 'blocked',
      badge: 'OUT OF RANGE',
      title: `Territory (${selectedCell.row}, ${selectedCell.col}) — Out of Range`,
      desc: 'Not attackable right now. Attacks can only advance into tiles that share an edge (North, South, East, West) with territory you already control.',
    };
  };

  const guidance = getContextualGuidance();

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* Inspected Tile Contextual Guidance Card */}
      <div
        className={`p-4 rounded-2xl border text-xs transition-all backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg ${
          guidance.type === 'legal'
            ? 'bg-emerald-950/50 border-emerald-500/70 text-emerald-200 ring-1 ring-emerald-500/30'
            : guidance.type === 'objective'
            ? 'bg-purple-950/60 border-purple-500/80 text-purple-200 ring-2 ring-purple-500/50'
            : guidance.type === 'threat'
            ? 'bg-rose-950/60 border-rose-500/80 text-rose-200 ring-2 ring-rose-500/40 animate-pulse'
            : guidance.type === 'contested'
            ? 'bg-amber-950/50 border-amber-500/70 text-amber-200'
            : guidance.type === 'friendly'
            ? 'bg-blue-950/50 border-blue-500/50 text-blue-200'
            : guidance.type === 'active'
            ? 'bg-purple-950/70 border-purple-400 text-purple-100 ring-2 ring-purple-400/50'
            : 'bg-zinc-950/80 border-zinc-800 text-zinc-300'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0 p-2 rounded-xl bg-black/40 border border-white/10">
            {guidance.type === 'legal' ? (
              <Crosshair className="w-5 h-5 text-emerald-400 animate-pulse" />
            ) : guidance.type === 'objective' ? (
              <Crown className="w-5 h-5 text-purple-300 animate-bounce" />
            ) : guidance.type === 'threat' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
            ) : guidance.type === 'contested' ? (
              <Target className="w-5 h-5 text-amber-400 animate-pulse" />
            ) : guidance.type === 'active' ? (
              <Swords className="w-5 h-5 text-purple-300 animate-pulse" />
            ) : (
              <Info className="w-5 h-5 text-zinc-400" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/50 border border-white/10 text-white">
                {guidance.badge}
              </span>
              {selectedCell && (
                <span className="text-[10px] font-mono text-zinc-400">
                  Coords: ({selectedCell.row}, {selectedCell.col}) • Owner:{' '}
                  {selectedCell.owner
                    ? `P${selectedCell.owner} ${selectedCell.owner === myPlayerSlot ? '(You)' : ''}`
                    : 'Unclaimed'}
                </span>
              )}
            </div>
            <h5 className="font-bold text-white text-sm">{guidance.title}</h5>
            <p className="text-xs text-zinc-300/90 leading-relaxed">{guidance.desc}</p>
          </div>
        </div>

        <button
          onClick={onOpenTutorial}
          className="shrink-0 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs font-bold flex items-center gap-1.5 transition-colors self-end sm:self-center"
          title="Interactive Tutorial"
        >
          <HelpCircle className="w-4 h-4 text-purple-400" />
          <span>How to Play</span>
        </button>
      </div>

      {/* Persistent Compact Territory Legend */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800/90 text-xs shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-900">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
            Battlefield Legend & States
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            You Command:{' '}
            <strong className={isP1 ? 'text-blue-400' : 'text-rose-400'}>
              {isP1 ? 'Blue Vanguard (P1)' : 'Red Challenger (P2)'}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-zinc-300">
          {/* Your Capital */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <div
              className={`p-1 rounded ${
                isP1 ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-white">Your Capital</span>
          </div>

          {/* Enemy Capital */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <div
              className={`p-1 rounded ${
                !isP1 ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-white">Enemy Capital</span>
          </div>

          {/* Fortress */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-900/60 border border-amber-500/40">
            <div className="p-1 rounded bg-amber-500/20 text-amber-400">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <span className="text-amber-300 font-semibold">Fortress (+2 def)</span>
          </div>

          {/* Legal Target */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-900/60 border border-emerald-500/50">
            <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
              <Crosshair className="w-3.5 h-3.5" />
            </div>
            <span className="text-emerald-300 font-bold">Legal Target</span>
          </div>

          {/* Your Territory */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <div
              className={`w-3.5 h-3.5 rounded border ${
                isP1
                  ? 'bg-blue-950/90 border-blue-500'
                  : 'bg-rose-950/90 border-rose-500'
              }`}
            />
            <span className={isP1 ? 'text-blue-300' : 'text-rose-300'}>Your Territory</span>
          </div>

          {/* Enemy Territory */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <div
              className={`w-3.5 h-3.5 rounded border ${
                !isP1
                  ? 'bg-blue-950/90 border-blue-500'
                  : 'bg-rose-950/90 border-rose-500'
              }`}
            />
            <span className={!isP1 ? 'text-blue-300' : 'text-rose-300'}>Enemy Territory</span>
          </div>

          {/* Neutral Territory */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <div className="w-3.5 h-3.5 rounded bg-zinc-900/90 border border-zinc-800" />
            <span className="text-zinc-400">Neutral Land</span>
          </div>

          {/* Territory Under Attack */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-900/60 border border-amber-500/50">
            <div className="p-1 rounded bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <span className="text-amber-300 font-semibold">Under Attack</span>
          </div>
        </div>
      </div>
    </div>
  );
};
