import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateConquestMap,
  isOrthogonallyAdjacent,
  getOrthogonalNeighbors,
  canTargetCell,
  isValidCoordinate,
  cellKey,
  GRID_SIZE,
  TOTAL_CELLS,
} from '../services/conquest/conquest-map.service';
import { ConquestMap } from '../services/conquest/conquest.types';

describe('Word Conquest — Core Map Engine', () => {
  describe('1. Grid Invariants & Territory Composition', () => {
    it('generates a 6x6 grid with strictly 36 cells', () => {
      const map = generateConquestMap('tournament-seed-2026');
      expect(map.gridSize).toBe(6);
      expect(map.totalCells).toBe(36);
      expect(map.cells).toHaveLength(36);
      expect(Object.keys(map.cellMap)).toHaveLength(36);
    });

    it('ensures every cell has unique IDs matching the (row, col) convention', () => {
      const map = generateConquestMap('unique-keys-seed');
      const seenIds = new Set<string>();

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const expectedKey = `r${r}_c${c}`;
          const cell = map.cellMap[expectedKey];
          expect(cell).toBeDefined();
          expect(cell.row).toBe(r);
          expect(cell.col).toBe(c);
          expect(seenIds.has(cell.id)).toBe(false);
          seenIds.add(cell.id);
        }
      }
      expect(seenIds.size).toBe(36);
    });

    it('places Player 1 Capital strictly at (0, 0) and Player 2 Capital strictly at (5, 5)', () => {
      const map = generateConquestMap('capitals-invariant-seed');

      const p1Cap = map.cellMap['r0_c0'];
      expect(p1Cap.type).toBe('CAPITAL');
      expect(p1Cap.owner).toBe(1);
      expect(p1Cap.defenseBonus).toBe(5);
      expect(map.capitals.player1).toEqual({ row: 0, col: 0 });

      const p2Cap = map.cellMap['r5_c5'];
      expect(p2Cap.type).toBe('CAPITAL');
      expect(p2Cap.owner).toBe(2);
      expect(p2Cap.defenseBonus).toBe(5);
      expect(map.capitals.player2).toEqual({ row: 5, col: 5 });
    });

    it('generates exactly 4 fortresses and 30 neutral lands across the map', () => {
      const map = generateConquestMap('composition-seed-99');

      const capitals = map.cells.filter((c) => c.type === 'CAPITAL');
      const fortresses = map.cells.filter((c) => c.type === 'FORTRESS');
      const neutrals = map.cells.filter((c) => c.type === 'NEUTRAL');

      expect(capitals).toHaveLength(2);
      expect(fortresses).toHaveLength(4);
      expect(neutrals).toHaveLength(30);

      // Verify fortress attributes
      for (const f of fortresses) {
        expect(f.owner).toBeNull();
        expect(f.defenseBonus).toBe(2);
      }

      // Verify neutral attributes
      for (const n of neutrals) {
        expect(n.owner).toBeNull();
        expect(n.defenseBonus).toBe(0);
      }

      // Check map summary coordinates
      expect(map.fortresses).toHaveLength(4);
    });
  });

  describe('2. Deterministic Reproducibility & Seed Diversity', () => {
    it('produces an identical map layout when given the exact same seed', () => {
      const seed = 'battle-arena-match-4829';
      const mapA = generateConquestMap(seed);
      const mapB = generateConquestMap(seed);

      expect(mapA.fortresses).toEqual(mapB.fortresses);
      expect(mapA.cells).toEqual(mapB.cells);
      expect(mapA.cellMap).toEqual(mapB.cellMap);
    });

    it('generates distinct fortress configurations across diverse seeds', () => {
      const seeds = [
        'seed-autumn-alpha',
        'seed-winter-bravo',
        'seed-spring-charlie',
        'seed-summer-delta',
        'seed-highland-echo',
      ];

      const configurations = seeds.map((s) => {
        const map = generateConquestMap(s);
        return map.fortresses.map((f) => cellKey(f.row, f.col)).sort().join(',');
      });

      const uniqueConfigs = new Set(configurations);
      expect(uniqueConfigs.size).toBeGreaterThan(1);
    });

    it('handles empty or whitespace seed safely without throwing', () => {
      const mapBlank = generateConquestMap('');
      const mapWhitespace = generateConquestMap('   ');

      expect(mapBlank.totalCells).toBe(36);
      expect(mapBlank.fortresses).toHaveLength(4);
      expect(mapWhitespace.totalCells).toBe(36);
      expect(mapWhitespace.fortresses).toHaveLength(4);
    });
  });

  describe('3. Competitive Balance & 180° Rotational Symmetry', () => {
    it('ensures each fortress has an exact 180° rotational counterpart for fair play', () => {
      const seeds = ['fairness-check-1', 'fairness-check-2', 'symmetric-balance-test'];

      for (const seed of seeds) {
        const map = generateConquestMap(seed);
        const fortressSet = new Set(map.fortresses.map((f) => cellKey(f.row, f.col)));

        for (const fortress of map.fortresses) {
          const counterpartR = GRID_SIZE - 1 - fortress.row;
          const counterpartC = GRID_SIZE - 1 - fortress.col;
          const counterpartKey = cellKey(counterpartR, counterpartC);

          expect(
            fortressSet.has(counterpartKey),
            `Fortress at (${fortress.row}, ${fortress.col}) must have 180° symmetric pair at (${counterpartR}, ${counterpartC})`
          ).toBe(true);
        }
      }
    });

    it('never places fortresses directly adjacent to capitals to prevent choke points', () => {
      const seeds = ['seed-10', 'seed-20', 'seed-30', 'seed-40', 'seed-50', 'seed-60'];
      const forbiddenSpawnNeighbors = new Set([
        'r0_c1', // adjacent to P1 (0,0)
        'r1_c0', // adjacent to P1 (0,0)
        'r5_c4', // adjacent to P2 (5,5)
        'r4_c5', // adjacent to P2 (5,5)
      ]);

      for (const seed of seeds) {
        const map = generateConquestMap(seed);
        for (const f of map.fortresses) {
          const key = cellKey(f.row, f.col);
          expect(forbiddenSpawnNeighbors.has(key)).toBe(false);
        }
      }
    });
  });

  describe('4. Orthogonal Adjacency Verification', () => {
    it('returns true for orthogonal neighbors (North, South, East, West)', () => {
      const center = { row: 2, col: 2 };
      expect(isOrthogonallyAdjacent(center, { row: 1, col: 2 })).toBe(true); // North
      expect(isOrthogonallyAdjacent(center, { row: 3, col: 2 })).toBe(true); // South
      expect(isOrthogonallyAdjacent(center, { row: 2, col: 1 })).toBe(true); // West
      expect(isOrthogonallyAdjacent(center, { row: 2, col: 3 })).toBe(true); // East
    });

    it('strictly returns false for diagonal neighbors', () => {
      const center = { row: 2, col: 2 };
      expect(isOrthogonallyAdjacent(center, { row: 1, col: 1 })).toBe(false); // NW
      expect(isOrthogonallyAdjacent(center, { row: 1, col: 3 })).toBe(false); // NE
      expect(isOrthogonallyAdjacent(center, { row: 3, col: 1 })).toBe(false); // SW
      expect(isOrthogonallyAdjacent(center, { row: 3, col: 3 })).toBe(false); // SE
    });

    it('returns false for identical coordinates, distance > 1, or out of bounds', () => {
      const origin = { row: 0, col: 0 };
      expect(isOrthogonallyAdjacent(origin, { row: 0, col: 0 })).toBe(false); // Same cell
      expect(isOrthogonallyAdjacent(origin, { row: 0, col: 2 })).toBe(false); // 2 steps away
      expect(isOrthogonallyAdjacent(origin, { row: -1, col: 0 })).toBe(false); // Out of bounds
      expect(isOrthogonallyAdjacent(origin, { row: 0, col: 6 })).toBe(false); // Out of bounds
    });

    it('retrieves correct number of orthogonal neighbors for corners, edges, and inner cells', () => {
      expect(getOrthogonalNeighbors(0, 0)).toHaveLength(2); // Corner (0,1), (1,0)
      expect(getOrthogonalNeighbors(5, 5)).toHaveLength(2); // Corner (5,4), (4,5)
      expect(getOrthogonalNeighbors(0, 3)).toHaveLength(3); // Top Edge
      expect(getOrthogonalNeighbors(3, 0)).toHaveLength(3); // Left Edge
      expect(getOrthogonalNeighbors(2, 2)).toHaveLength(4); // Center (N, S, W, E)
      expect(getOrthogonalNeighbors(-1, 0)).toHaveLength(0); // Out of bounds
    });
  });

  describe('5. Candidate Move Validation (canTargetCell)', () => {
    let freshMap: ConquestMap;

    beforeEach(() => {
      freshMap = generateConquestMap('move-validation-fixture');
    });

    it('allows Player 1 to target immediate orthogonal neighbors of starting capital (0, 0)', () => {
      const eastMove = canTargetCell(freshMap, 1, 0, 1);
      const southMove = canTargetCell(freshMap, 1, 1, 0);

      expect(eastMove.canTarget).toBe(true);
      expect(southMove.canTarget).toBe(true);
    });

    it('allows Player 2 to target immediate orthogonal neighbors of starting capital (5, 5)', () => {
      const westMove = canTargetCell(freshMap, 2, 5, 4);
      const northMove = canTargetCell(freshMap, 2, 4, 5);

      expect(westMove.canTarget).toBe(true);
      expect(northMove.canTarget).toBe(true);
    });

    it('rejects targeting own cell', () => {
      const p1SelfTarget = canTargetCell(freshMap, 1, 0, 0);
      expect(p1SelfTarget.canTarget).toBe(false);
      expect(p1SelfTarget.reason).toContain('already own it');

      const p2SelfTarget = canTargetCell(freshMap, 2, 5, 5);
      expect(p2SelfTarget.canTarget).toBe(false);
      expect(p2SelfTarget.reason).toContain('already own it');
    });

    it('rejects targeting diagonal or distant non-adjacent cells at match opening', () => {
      // Diagonal neighbor (1, 1) is not orthogonally adjacent to (0, 0)
      const diagMove = canTargetCell(freshMap, 1, 1, 1);
      expect(diagMove.canTarget).toBe(false);
      expect(diagMove.reason).toContain('not adjacent');

      // Center cell (2, 2)
      const centerMove = canTargetCell(freshMap, 1, 2, 2);
      expect(centerMove.canTarget).toBe(false);

      // Enemy capital (5, 5) from across the board
      const rushP2Cap = canTargetCell(freshMap, 1, 5, 5);
      expect(rushP2Cap.canTarget).toBe(false);
    });

    it('rejects targets that are out of bounds with descriptive failure reason', () => {
      const negativeRow = canTargetCell(freshMap, 1, -1, 0);
      expect(negativeRow.canTarget).toBe(false);
      expect(negativeRow.reason).toContain('out of bounds');

      const beyondCol = canTargetCell(freshMap, 1, 0, 6);
      expect(beyondCol.canTarget).toBe(false);
      expect(beyondCol.reason).toContain('out of bounds');
    });

    it('expands attackable perimeter dynamically as player conquers territory', () => {
      // Player 1 captures (0, 1)
      freshMap.cellMap['r0_c1'].owner = 1;

      // Now Player 1 should be eligible to target (0, 2) and (1, 1)
      const target02 = canTargetCell(freshMap, 1, 0, 2);
      const target11 = canTargetCell(freshMap, 1, 1, 1);

      expect(target02.canTarget).toBe(true);
      expect(target11.canTarget).toBe(true);

      // But still cannot target (1, 2) or (2, 2) which are not adjacent to any owned territory
      const target12 = canTargetCell(freshMap, 1, 1, 2);
      expect(target12.canTarget).toBe(false);
    });

    it('allows targeting an enemy fortress or capital when orthogonally adjacent', () => {
      // Simulate Player 1 advancing to (5, 4), which is adjacent to Player 2 Capital (5, 5)
      freshMap.cellMap['r5_c4'].owner = 1;

      const attackP2Cap = canTargetCell(freshMap, 1, 5, 5);
      expect(attackP2Cap.canTarget).toBe(true);
    });

    it('allows targeting an adjacent unowned fortress', () => {
      // Find where fortresses are located
      const fortress = freshMap.fortresses[0];
      // Give Player 1 one of the orthogonal neighbors of this fortress
      const neighbors = getOrthogonalNeighbors(fortress.row, fortress.col);
      expect(neighbors.length).toBeGreaterThan(0);
      const friendlyNeighbor = neighbors[0];
      freshMap.cellMap[cellKey(friendlyNeighbor.row, friendlyNeighbor.col)].owner = 1;

      const targetFortress = canTargetCell(freshMap, 1, fortress.row, fortress.col);
      expect(targetFortress.canTarget).toBe(true);
    });

    it('rejects NaN, Infinity, or float coordinates safely', () => {
      expect(canTargetCell(freshMap, 1, NaN, 2).canTarget).toBe(false);
      expect(canTargetCell(freshMap, 1, 1.5, 2).canTarget).toBe(false);
      expect(canTargetCell(freshMap, 1, Infinity, 0).canTarget).toBe(false);
    });
  });

  describe('6. High-Entropy Seed Fuzzing & Invariance Verification', () => {
    it('guarantees strictly 36 total cells, 4 unique fortresses, and 30 neutral lands across 1,000 seeds', () => {
      const edgeCaseSeeds = [
        '',
        '   ',
        '0',
        'null',
        'undefined',
        '⚔️🛡️🔥',
        'seed_with_very_long_string_'.repeat(20),
        '!@#$%^&*()_+=-~`[]{}|;:",.<>?/',
        '1234567890',
        'ROTATIONAL_SYMMETRY_CHECK',
      ];

      // Add 990 randomized seeds
      for (let i = 0; i < 990; i++) {
        edgeCaseSeeds.push(`fuzz_seed_${i}_${(Math.random() * 1e9).toString(36)}`);
      }

      for (const seed of edgeCaseSeeds) {
        const map = generateConquestMap(seed);

        // 1. Total cell count invariant
        expect(map.totalCells).toBe(36);
        expect(map.cells).toHaveLength(36);
        expect(Object.keys(map.cellMap)).toHaveLength(36);

        // 2. Capitals strictly at (0,0) and (5,5)
        expect(map.cellMap['r0_c0'].type).toBe('CAPITAL');
        expect(map.cellMap['r0_c0'].owner).toBe(1);
        expect(map.cellMap['r5_c5'].type).toBe('CAPITAL');
        expect(map.cellMap['r5_c5'].owner).toBe(2);

        // 3. Exactly 4 fortresses
        expect(map.fortresses).toHaveLength(4);
        const fortressSet = new Set(map.fortresses.map((f) => cellKey(f.row, f.col)));
        expect(fortressSet.size).toBe(4); // No duplicates!

        // 4. Territory counts: 2 capitals, 4 fortresses, 30 neutrals
        const capitals = map.cells.filter((c) => c.type === 'CAPITAL');
        const fortresses = map.cells.filter((c) => c.type === 'FORTRESS');
        const neutrals = map.cells.filter((c) => c.type === 'NEUTRAL');
        expect(capitals).toHaveLength(2);
        expect(fortresses).toHaveLength(4);
        expect(neutrals).toHaveLength(30);

        // 5. Rotational symmetry of fortresses: (r, c) <-> (5 - r, 5 - c)
        for (const f of map.fortresses) {
          const counterpartKey = cellKey(5 - f.row, 5 - f.col);
          expect(fortressSet.has(counterpartKey)).toBe(true);
        }

        // 6. Starting neighbors are never fortresses
        expect(fortressSet.has('r0_c1')).toBe(false);
        expect(fortressSet.has('r1_c0')).toBe(false);
        expect(fortressSet.has('r5_c4')).toBe(false);
        expect(fortressSet.has('r4_c5')).toBe(false);
      }
    });
  });
});
