import {
  Coordinate,
  TerritoryCell,
  ConquestMap,
  PlayerSlot,
  MoveValidationResult,
} from './conquest.types';

export const GRID_SIZE = 6;
export const TOTAL_CELLS = GRID_SIZE * GRID_SIZE; // 36

/**
 * Coordinate string key: "r{row}_c{col}"
 * Convention:
 * row: 0 (North / Top) to 5 (South / Bottom)
 * col: 0 (West / Left) to 5 (East / Right)
 */
export function cellKey(row: number, col: number): string {
  return `r${row}_c${col}`;
}

/**
 * Validates if a coordinate is strictly within the 6x6 grid bounds.
 */
export function isValidCoordinate(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < GRID_SIZE &&
    col >= 0 &&
    col < GRID_SIZE
  );
}

/**
 * Checks if two coordinates are orthogonally adjacent (North, South, East, West).
 * Diagonal neighbors, identical cells, and out-of-bounds cells return false.
 */
export function isOrthogonallyAdjacent(c1: Coordinate, c2: Coordinate): boolean {
  if (!isValidCoordinate(c1.row, c1.col) || !isValidCoordinate(c2.row, c2.col)) {
    return false;
  }
  const rowDiff = Math.abs(c1.row - c2.row);
  const colDiff = Math.abs(c1.col - c2.col);
  return rowDiff + colDiff === 1;
}

/**
 * Returns all valid in-bounds orthogonal neighbors for a cell (2, 3, or 4 cells).
 */
export function getOrthogonalNeighbors(row: number, col: number): Coordinate[] {
  if (!isValidCoordinate(row, col)) return [];

  const deltas = [
    { row: -1, col: 0 }, // North
    { row: 1, col: 0 },  // South
    { row: 0, col: -1 }, // West
    { row: 0, col: 1 },  // East
  ];

  return deltas
    .map((d) => ({ row: row + d.row, col: col + d.col }))
    .filter((coord) => isValidCoordinate(coord.row, coord.col));
}

/**
 * 32-bit FNV-1a string hashing for deterministic PRNG seeding.
 */
function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 PRNG: Fast, high-entropy 32-bit pseudo-random number generator.
 */
function createPRNG(seedNumber: number): () => number {
  let s = seedNumber >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates symmetric fortress candidate pairs for 180-degree rotational balance:
 * (r, c) <-> (5 - r, 5 - c).
 * Excludes capitals (0,0)/(5,5) and immediate starting neighbors.
 */
function getEligibleFortressPairs(): Array<[Coordinate, Coordinate]> {
  const pairs: Array<[Coordinate, Coordinate]> = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const oppR = GRID_SIZE - 1 - r;
      const oppC = GRID_SIZE - 1 - c;

      // Only consider canonical half to avoid duplicates
      if (r > oppR || (r === oppR && c >= oppC)) continue;

      // Exclude Capitals
      if (r === 0 && c === 0) continue;
      // Exclude immediate Capital neighbors so starting positions aren't choked
      if ((r === 0 && c === 1) || (r === 1 && c === 0)) continue;
      if ((oppR === 5 && oppC === 4) || (oppR === 4 && oppC === 5)) continue;

      pairs.push([
        { row: r, col: c },
        { row: oppR, col: oppC },
      ]);
    }
  }

  return pairs;
}

/**
 * Deterministically generates a 6x6 ConquestMap from a string seed.
 * - Player 1 Capital at (0, 0)
 * - Player 2 Capital at (5, 5)
 * - Exactly 4 Fortresses (2 symmetric pairs)
 * - Exactly 30 Neutral lands
 */
export function generateConquestMap(seed: string): ConquestMap {
  const cleanSeed =
    typeof seed === 'string' && seed.trim().length > 0
      ? seed.trim()
      : seed != null && String(seed).trim().length > 0
      ? String(seed).trim()
      : 'default_seed';
  const prng = createPRNG(hashString(cleanSeed));

  // 1. Select 2 distinct symmetric pairs of fortresses
  const candidatePairs = getEligibleFortressPairs();

  // Fisher-Yates deterministic shuffle
  for (let i = candidatePairs.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const temp = candidatePairs[i];
    candidatePairs[i] = candidatePairs[j];
    candidatePairs[j] = temp;
  }

  const selectedPairs = candidatePairs.slice(0, 2);
  const fortressSet = new Set<string>();
  const fortresses: Coordinate[] = [];

  for (const [c1, c2] of selectedPairs) {
    fortressSet.add(cellKey(c1.row, c1.col));
    fortressSet.add(cellKey(c2.row, c2.col));
    fortresses.push(c1, c2);
  }

  // 2. Build 36 cells
  const cells: TerritoryCell[] = [];
  const cellMap: Record<string, TerritoryCell> = {};

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const key = cellKey(r, c);
      let cell: TerritoryCell;

      if (r === 0 && c === 0) {
        // Player 1 Capital
        cell = {
          id: key,
          row: r,
          col: c,
          type: 'CAPITAL',
          owner: 1,
          name: 'Blue Capital Citadel',
          defenseBonus: 5,
        };
      } else if (r === 5 && c === 5) {
        // Player 2 Capital
        cell = {
          id: key,
          row: r,
          col: c,
          type: 'CAPITAL',
          owner: 2,
          name: 'Red Capital Citadel',
          defenseBonus: 5,
        };
      } else if (fortressSet.has(key)) {
        // Defensive Fortress
        cell = {
          id: key,
          row: r,
          col: c,
          type: 'FORTRESS',
          owner: null,
          name: `Iron Bastion (${r},${c})`,
          defenseBonus: 2,
        };
      } else {
        // Neutral Territory
        cell = {
          id: key,
          row: r,
          col: c,
          type: 'NEUTRAL',
          owner: null,
          name: `Neutral Land (${r},${c})`,
          defenseBonus: 0,
        };
      }

      cells.push(cell);
      cellMap[key] = cell;
    }
  }

  return {
    seed: cleanSeed,
    gridSize: GRID_SIZE,
    totalCells: TOTAL_CELLS,
    cells,
    cellMap,
    capitals: {
      player1: { row: 0, col: 0 },
      player2: { row: 5, col: 5 },
    },
    fortresses,
  };
}

/**
 * Validates whether a player can launch a move/attack on a given target cell.
 */
export function canTargetCell(
  map: ConquestMap,
  playerSlot: PlayerSlot,
  targetRow: number,
  targetCol: number
): MoveValidationResult {
  // 1. Boundary validation
  if (!isValidCoordinate(targetRow, targetCol)) {
    return {
      canTarget: false,
      reason: `Coordinate (${targetRow}, ${targetCol}) is out of bounds (Grid is 0..${GRID_SIZE - 1}).`,
    };
  }

  // 2. Existence check
  const targetKey = cellKey(targetRow, targetCol);
  const targetCell = map.cellMap[targetKey];
  if (!targetCell) {
    return {
      canTarget: false,
      reason: `Target cell "${targetKey}" does not exist in map.`,
    };
  }

  // 3. Friendly territory guard: Cannot attack own cell
  if (targetCell.owner === playerSlot) {
    return {
      canTarget: false,
      reason: `Cannot attack cell (${targetRow}, ${targetCol}) because you already own it.`,
    };
  }

  // 4. Adjacency validation: Must be orthogonally adjacent to at least one cell owned by the player
  const neighbors = getOrthogonalNeighbors(targetRow, targetCol);
  const hasFriendlyAdjacent = neighbors.some((n) => {
    const neighborCell = map.cellMap[cellKey(n.row, n.col)];
    return neighborCell && neighborCell.owner === playerSlot;
  });

  if (!hasFriendlyAdjacent) {
    return {
      canTarget: false,
      reason: `Cell (${targetRow}, ${targetCol}) is not adjacent to any territory you control. Attacks require orthogonal adjacency (N, S, E, W).`,
    };
  }

  return { canTarget: true };
}
