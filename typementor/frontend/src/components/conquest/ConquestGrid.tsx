import React, { useMemo } from 'react';
import { Crown, Shield, Crosshair, Swords, AlertTriangle } from 'lucide-react';
import {
  ConquestBoard,
  PlayerSlot,
  TerritoryCell,
  ActiveAttackChallenge,
} from '../../types/conquest';

interface ConquestGridProps {
  board: ConquestBoard;
  myPlayerSlot: PlayerSlot | null;
  activeChallenge: ActiveAttackChallenge | null;
  opponentAttackingCellKey: string | null;
  selectedCell?: TerritoryCell | null;
  onCellClick: (cell: TerritoryCell) => void;
  onSelectCell?: (cell: TerritoryCell) => void;
  disabled?: boolean;
}

export const ConquestGrid: React.FC<ConquestGridProps> = ({
  board,
  myPlayerSlot,
  activeChallenge,
  opponentAttackingCellKey,
  selectedCell,
  onCellClick,
  onSelectCell,
  disabled = false,
}) => {
  // Compute legal candidate targets for the current player
  // Candidate = Orthogonally adjacent to any territory owned by myPlayerSlot, and NOT owned by myPlayerSlot
  const candidateCellKeys = useMemo(() => {
    if (!myPlayerSlot || disabled || activeChallenge !== null) {
      return new Set<string>();
    }

    const ownedCoords: { row: number; col: number }[] = [];
    for (const cell of board.cells) {
      if (cell.owner === myPlayerSlot) {
        ownedCoords.push({ row: cell.row, col: cell.col });
      }
    }

    const candidates = new Set<string>();
    const deltas = [
      [-1, 0], // North
      [1, 0], // South
      [0, -1], // West
      [0, 1], // East
    ];

    for (const { row, col } of ownedCoords) {
      for (const [dr, dc] of deltas) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < 6 && nc >= 0 && nc < 6) {
          const key = `r${nr}_c${nc}`;
          const neighbor = board.cellMap[key];
          if (neighbor && neighbor.owner !== myPlayerSlot) {
            candidates.add(key);
          }
        }
      }
    }

    return candidates;
  }, [board, myPlayerSlot, disabled, activeChallenge]);

  const handleCellClick = (cell: TerritoryCell) => {
    onSelectCell?.(cell);
    const isCandidate = candidateCellKeys.has(cell.id);
    if (isCandidate && !disabled) {
      onCellClick(cell);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-4">
      {/* 6x6 Tactical Battlefield Grid */}
      <div
        role="grid"
        aria-label="Word Conquest 6x6 Tactical Battlefield"
        className="w-full aspect-square p-2.5 sm:p-4 rounded-3xl bg-zinc-950/90 border border-zinc-800 shadow-2xl grid grid-cols-6 gap-1.5 sm:gap-2.5 backdrop-blur-xl relative"
      >
        {board.cells.map((cell) => {
          const isCandidate = candidateCellKeys.has(cell.id);
          const isBeingAttackedByMe = activeChallenge?.targetCellKey === cell.id;
          const isUnderOpponentAttack = opponentAttackingCellKey === cell.id;
          const isSelected = selectedCell?.id === cell.id;

          const isP1 = cell.owner === 1;
          const isP2 = cell.owner === 2;
          const isMine = myPlayerSlot !== null && cell.owner === myPlayerSlot;
          const isCapital = cell.type === 'CAPITAL';
          const isFortress = cell.type === 'FORTRESS';

          // Base visual styling by ownership & special structure
          let bgClass = 'bg-zinc-900/40 hover:bg-zinc-800/60 border-zinc-800 text-zinc-300';
          let borderGlow = '';

          if (isP1) {
            bgClass = isFortress
              ? 'bg-blue-950/80 border-blue-500/80 text-blue-100 shadow-sm shadow-blue-500/10'
              : 'bg-blue-950/60 border-blue-500/70 text-blue-200 shadow-sm shadow-blue-500/10';
          } else if (isP2) {
            bgClass = isFortress
              ? 'bg-rose-950/80 border-rose-500/80 text-rose-100 shadow-sm shadow-rose-500/10'
              : 'bg-rose-950/60 border-rose-500/70 text-rose-200 shadow-sm shadow-rose-500/10';
          } else if (isFortress) {
            bgClass = 'bg-amber-950/40 border-amber-500/60 text-amber-200';
          }

          // Active states & highlighting
          if (isBeingAttackedByMe) {
            borderGlow =
              'ring-2 ring-purple-400 ring-offset-2 ring-offset-zinc-950 animate-pulse bg-purple-950/70 border-purple-400 z-10';
          } else if (isUnderOpponentAttack) {
            borderGlow = isMine
              ? 'ring-4 ring-amber-400 ring-offset-1 ring-offset-zinc-950 animate-pulse border-amber-400 bg-amber-950/50 z-10'
              : 'ring-2 ring-amber-400/80 border-amber-400/80 bg-amber-950/30';
          } else if (isCandidate) {
            borderGlow =
              'border-emerald-500 ring-2 ring-emerald-500/50 hover:border-emerald-400 hover:scale-[1.03] cursor-pointer shadow-lg shadow-emerald-500/20';
          }

          // High-contrast Selected Tile Frame
          if (isSelected) {
            borderGlow +=
              ' ring-4 ring-yellow-400 ring-offset-2 ring-offset-zinc-950 scale-[1.04] z-20 shadow-2xl shadow-yellow-500/40';
          }

          return (
            <button
              key={cell.id}
              onClick={() => handleCellClick(cell)}
              aria-label={`Territory at row ${cell.row}, col ${cell.col}. Type: ${cell.type}. Owner: ${
                cell.owner ? `Player ${cell.owner}` : 'Neutral'
              }${isCandidate ? '. Legal target' : ''}${
                isUnderOpponentAttack ? '. Under attack' : ''
              }${isSelected ? '. Currently selected' : ''}`}
              className={`relative rounded-xl sm:rounded-2xl border flex flex-col items-center justify-between p-1.5 sm:p-2 transition-all select-none overflow-hidden group ${bgClass} ${borderGlow} cursor-pointer focus:outline-none`}
            >
              {/* Top Header Bar: Coordinates & Status Icons */}
              <div className="w-full flex items-center justify-between pointer-events-none text-[9px] sm:text-[10px] font-mono leading-none">
                <span className="opacity-70 font-bold">
                  {cell.row},{cell.col}
                </span>

                <div className="flex items-center gap-1">
                  {/* Capital Crown */}
                  {isCapital && (
                    <Crown
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                        cell.row === 0
                          ? 'text-blue-400 animate-pulse'
                          : 'text-rose-400 animate-pulse'
                      }`}
                    />
                  )}

                  {/* Fortress Shield */}
                  {isFortress && (
                    <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                  )}

                  {/* Opponent Attack Warning Indicator */}
                  {isUnderOpponentAttack && (
                    <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 animate-bounce" />
                  )}

                  {/* Active Friendly Assault Swords */}
                  {isBeingAttackedByMe && (
                    <Swords className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400 animate-pulse" />
                  )}

                  {/* Legal Candidate Crosshair */}
                  {isCandidate && (
                    <Crosshair className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  )}
                </div>
              </div>

              {/* Center Cell Identity & Target Badge */}
              <div className="my-auto flex flex-col items-center justify-center text-center pointer-events-none px-0.5">
                {isCandidate ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[8px] sm:text-[9px] font-black uppercase text-emerald-300 tracking-wider px-1 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/60 shadow-sm">
                      {isCapital ? 'Siege Capital' : isFortress ? 'Storm Bastion' : 'Target'}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-bold text-zinc-300 opacity-90 truncate max-w-[50px] sm:max-w-none">
                      {isCapital
                        ? cell.row === 0
                          ? 'Blue Citadel'
                          : 'Red Citadel'
                        : isFortress
                        ? 'Bastion'
                        : cell.owner !== null
                        ? `Enemy P${cell.owner}`
                        : 'Neutral'}
                    </span>
                  </div>
                ) : isUnderOpponentAttack ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1 py-0.5 rounded ${
                        isMine
                          ? 'bg-rose-950/90 text-rose-300 border border-rose-500/80 animate-pulse'
                          : 'bg-amber-950/90 text-amber-300 border border-amber-500/80'
                      }`}
                    >
                      {isMine ? 'Under Siege' : 'Contested'}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-bold text-zinc-300 truncate max-w-[50px] sm:max-w-none">
                      {isCapital ? 'Citadel' : isFortress ? 'Bastion' : 'Territory'}
                    </span>
                  </div>
                ) : (
                  <span className="text-[9px] sm:text-xs font-bold leading-tight text-center line-clamp-1">
                    {isCapital
                      ? cell.row === 0
                        ? 'Blue Citadel'
                        : 'Red Citadel'
                      : isFortress
                      ? 'Bastion'
                      : cell.owner !== null
                      ? isMine
                        ? 'Territory'
                        : `P${cell.owner} Held`
                      : ''}
                  </span>
                )}
              </div>

              {/* Bottom Footer: Defense Bonus & Unambiguous Owner Badge */}
              <div className="w-full flex items-center justify-between text-[8px] sm:text-[9px] pointer-events-none leading-none">
                {/* Defense modifier */}
                {cell.defenseBonus > 0 ? (
                  <span className="px-1 py-0.5 rounded bg-zinc-950/80 text-amber-300 font-mono font-bold border border-amber-500/30">
                    +{cell.defenseBonus}
                  </span>
                ) : (
                  <span />
                )}

                {/* Explicit Owner Marker (always visible when owned) */}
                {cell.owner !== null ? (
                  <span
                    className={`px-1 py-0.5 rounded font-black text-[8px] uppercase tracking-wider border shadow-sm ${
                      cell.owner === 1
                        ? 'bg-blue-500/25 text-blue-200 border-blue-400/50'
                        : 'bg-rose-500/25 text-rose-200 border-rose-400/50'
                    }`}
                  >
                    P{cell.owner}
                    {isMine && <span className="hidden sm:inline font-sans font-bold"> (You)</span>}
                  </span>
                ) : (
                  <span className="text-[7px] sm:text-[8px] text-zinc-500 font-mono uppercase">
                    Free
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
