import {
  ActiveAttackChallenge,
  AttackSubmissionResult,
  ChallengeGenerationParams,
  PersistedGridState,
  PlayerSlot,
  TerritoryCell,
} from './conquest.types';
import {
  canTargetCell,
  cellKey,
  GRID_SIZE,
} from './conquest-map.service';
import {
  generateConquestChallenge,
  resolveTerritoryChallengeType,
} from './conquest-challenge.service';

export const ATTACK_DEADLINE_MS = 75 * 1000; // 75 seconds strict server-side deadline

export class ConquestCombatService {
  /**
   * Authoritatively initiates an attack challenge for a player targeting a grid coordinate.
   * Enforces bounds, friendly territory guards, single-challenge-per-player limit, and orthogonal adjacency.
   */
  static initiateAttack(params: {
    matchId: string;
    userId: string;
    playerSlot: PlayerSlot;
    targetRow: number;
    targetCol: number;
    currentGridState: PersistedGridState;
    matchSeed: string;
    currentTurn: number;
    now?: number;
  }): { challenge: ActiveAttackChallenge; updatedGridState: PersistedGridState } {
    const {
      userId,
      playerSlot,
      targetRow,
      targetCol,
      currentGridState,
      matchSeed,
      currentTurn,
    } = params;

    const now = params.now ?? Date.now();

    // 1. One active attack challenge per player rule
    const existingChallenge = currentGridState.activeChallenges[userId];
    if (existingChallenge) {
      if (now < existingChallenge.deadlineAt) {
        throw new Error(
          'You already have an active attack challenge in progress. Complete it or wait for it to expire.'
        );
      }
      // If deadline has passed, clear the stale challenge automatically
      currentGridState.activeChallenges[userId] = null;
      if (!currentGridState.completedChallengeIds.includes(existingChallenge.challengeId)) {
        currentGridState.completedChallengeIds.push(existingChallenge.challengeId);
      }
    }

    // 2. Validate grid coordinates
    if (
      !Number.isInteger(targetRow) ||
      !Number.isInteger(targetCol) ||
      targetRow < 0 ||
      targetRow >= GRID_SIZE ||
      targetCol < 0 ||
      targetCol >= GRID_SIZE
    ) {
      throw new Error(`Target coordinates (${targetRow}, ${targetCol}) are out of grid bounds.`);
    }

    const targetKey = cellKey(targetRow, targetCol);
    const targetCell = currentGridState.cells[targetKey];
    if (!targetCell) {
      throw new Error(`Target territory "${targetKey}" does not exist on the board.`);
    }

    // 3. Friendly territory guard: Cannot attack a cell you already control
    if (targetCell.owner === playerSlot) {
      throw new Error(`You already control territory (${targetRow}, ${targetCol}).`);
    }

    // 4. Orthogonal adjacency validation
    // Construct lightweight ConquestMap adapter for pure validator
    const mapAdapter = {
      seed: matchSeed,
      gridSize: GRID_SIZE,
      totalCells: GRID_SIZE * GRID_SIZE,
      cells: Object.values(currentGridState.cells),
      cellMap: currentGridState.cells,
      capitals: {
        player1: { row: 0, col: 0 },
        player2: { row: 5, col: 5 },
      },
      fortresses: [],
    };

    const adjacencyCheck = canTargetCell(mapAdapter, playerSlot, targetRow, targetCol);
    if (!adjacencyCheck.canTarget) {
      throw new Error(adjacencyCheck.reason || 'Target cell is not orthogonally adjacent to any owned territory.');
    }

    // 5. Resolve contextual difficulty and challenge
    const territoryType = resolveTerritoryChallengeType(targetCell, playerSlot);
    const challengeParams: ChallengeGenerationParams = {
      challengeSeed: matchSeed,
      territoryType,
      targetCellKey: targetKey,
      turn: currentTurn,
      attemptIndex: currentGridState.completedChallengeIds.length,
    };

    const generated = generateConquestChallenge(challengeParams);

    const activeChallenge: ActiveAttackChallenge = {
      challengeId: generated.challengeId,
      userId,
      playerSlot,
      targetCellKey: targetKey,
      territoryType: generated.territoryType,
      difficultyTier: generated.difficultyTier,
      passageId: generated.passageId,
      passageTitle: generated.passageTitle,
      passageText: generated.passageText,
      wordCount: generated.wordCount,
      charCount: generated.charCount,
      defenseModifier: generated.defenseModifier,
      minAccuracy: generated.minAccuracy,
      startedAt: now,
      deadlineAt: now + ATTACK_DEADLINE_MS,
    };

    // 6. Update grid state copy
    const updatedGridState: PersistedGridState = {
      ...currentGridState,
      activeChallenges: {
        ...currentGridState.activeChallenges,
        [userId]: activeChallenge,
      },
    };

    return { challenge: activeChallenge, updatedGridState };
  }

  /**
   * Evaluates final typing submission authoritatively against the server passage.
   * Verifies character-by-character accuracy, completion status, deadline, and re-validates board state.
   */
  static submitChallenge(params: {
    userId: string;
    challengeId: string;
    submittedText: string;
    currentGridState: PersistedGridState;
    now?: number;
  }): AttackSubmissionResult {
    const { userId, challengeId, submittedText, currentGridState } = params;
    const now = params.now ?? Date.now();

    const activeChallenge = currentGridState.activeChallenges[userId];
    if (!activeChallenge || activeChallenge.challengeId !== challengeId) {
      throw new Error('No matching active challenge found for this submission or challenge already resolved.');
    }

    // 1. Authoritative deadline check
    if (now > activeChallenge.deadlineAt) {
      const updatedGridState: PersistedGridState = {
        ...currentGridState,
        activeChallenges: {
          ...currentGridState.activeChallenges,
          [userId]: null,
        },
        completedChallengeIds: [...currentGridState.completedChallengeIds, challengeId],
      };

      return {
        success: false,
        reason: 'Challenge submission timed out (exceeded 75-second deadline).',
        challengeId,
        targetCellKey: activeChallenge.targetCellKey,
        accuracy: 0,
        wpm: 0,
        minAccuracyRequired: activeChallenge.minAccuracy,
        isCapitalCapture: false,
        gridState: updatedGridState,
      };
    }

    // 2. Authoritative comparison using Longest Common Subsequence (prevents off-by-one accuracy cascade)
    const expected = activeChallenge.passageText.replace(/\r\n/g, '\n').trim();
    const actual = (submittedText || '').replace(/\r\n/g, '\n').trim();

    let correctChars = 0;
    if (actual === expected) {
      correctChars = actual.length;
    } else {
      correctChars = this.computeLcsLength(actual, expected);
    }

    const maxLen = Math.max(actual.length, expected.length, 1);
    const accuracy = Math.min(100, Math.max(0, Math.round((correctChars / maxLen) * 1000) / 10));

    const elapsedMs = Math.max(10, now - activeChallenge.startedAt);
    const elapsedMinutes = elapsedMs / 60000;
    const netWords = correctChars / 5;
    const wpm = Math.max(0, Math.round((netWords / elapsedMinutes) * 10) / 10);

    // Human pacing & anti-paste validation (max 250 WPM, min 1.5s duration)
    const MAX_PLAUSIBLE_HUMAN_WPM = 250;
    const MIN_PLAUSIBLE_DURATION_MS = 1500;

    if (wpm > MAX_PLAUSIBLE_HUMAN_WPM || elapsedMs < MIN_PLAUSIBLE_DURATION_MS) {
      const updatedGridState: PersistedGridState = {
        ...currentGridState,
        activeChallenges: {
          ...currentGridState.activeChallenges,
          [userId]: null,
        },
        completedChallengeIds: [...currentGridState.completedChallengeIds, challengeId],
      };

      return {
        success: false,
        reason: `Submission rejected: typing velocity (${wpm} WPM in ${(elapsedMs / 1000).toFixed(1)}s) exceeds plausible human limits. Instant paste macros are prohibited.`,
        challengeId,
        targetCellKey: activeChallenge.targetCellKey,
        accuracy,
        wpm,
        minAccuracyRequired: activeChallenge.minAccuracy,
        isCapitalCapture: false,
        gridState: updatedGridState,
      };
    }

    const isFullyCompleted = actual.length >= expected.length;
    const isAccuracyMet = accuracy >= activeChallenge.minAccuracy;

    // 3. If typing challenge failed:
    if (!isFullyCompleted || !isAccuracyMet) {
      const failReason = !isFullyCompleted
        ? 'Passage was not fully typed to completion.'
        : `Accuracy of ${accuracy}% did not meet the required ${activeChallenge.minAccuracy}% threshold for this territory.`;

      const updatedGridState: PersistedGridState = {
        ...currentGridState,
        activeChallenges: {
          ...currentGridState.activeChallenges,
          [userId]: null,
        },
        completedChallengeIds: [...currentGridState.completedChallengeIds, challengeId],
      };

      return {
        success: false,
        reason: failReason,
        challengeId,
        targetCellKey: activeChallenge.targetCellKey,
        accuracy,
        wpm,
        minAccuracyRequired: activeChallenge.minAccuracy,
        isCapitalCapture: false,
        gridState: updatedGridState,
      };
    }

    // 4. Typing challenge passed! Re-validate board state at completion time
    const targetCell = currentGridState.cells[activeChallenge.targetCellKey];
    if (!targetCell) {
      throw new Error(`Target cell "${activeChallenge.targetCellKey}" no longer exists on board.`);
    }

    // If player already somehow owns this cell (e.g. duplicate simultaneous event), reject
    if (targetCell.owner === activeChallenge.playerSlot) {
      const updatedGridState: PersistedGridState = {
        ...currentGridState,
        activeChallenges: {
          ...currentGridState.activeChallenges,
          [userId]: null,
        },
        completedChallengeIds: [...currentGridState.completedChallengeIds, challengeId],
      };

      return {
        success: false,
        reason: 'Target territory is already controlled by your side.',
        challengeId,
        targetCellKey: activeChallenge.targetCellKey,
        accuracy,
        wpm,
        minAccuracyRequired: activeChallenge.minAccuracy,
        isCapitalCapture: false,
        gridState: updatedGridState,
      };
    }

    // 5. Concurrency-safe atomic capture execution
    const updatedCells: Record<string, TerritoryCell> = {
      ...currentGridState.cells,
      [activeChallenge.targetCellKey]: {
        ...targetCell,
        owner: activeChallenge.playerSlot,
      },
    };

    // If the opponent was simultaneously attacking this exact cell, invalidate the opponent's stale attack
    const updatedActiveChallenges = { ...currentGridState.activeChallenges };
    updatedActiveChallenges[userId] = null; // Clear acting player's challenge

    for (const [otherUserId, otherChallenge] of Object.entries(updatedActiveChallenges)) {
      if (otherChallenge && otherChallenge.targetCellKey === activeChallenge.targetCellKey) {
        // Opponent's challenge on this contested cell is invalidated because it was just captured
        updatedActiveChallenges[otherUserId] = null;
        if (!currentGridState.completedChallengeIds.includes(otherChallenge.challengeId)) {
          currentGridState.completedChallengeIds.push(otherChallenge.challengeId);
        }
      }
    }

    // 6. Check for Capital Victory
    // Player 1 Capital is at r0_c0, Player 2 Capital is at r5_c5
    const isEnemyCapital =
      targetCell.type === 'CAPITAL' &&
      ((activeChallenge.playerSlot === 1 && activeChallenge.targetCellKey === 'r5_c5') ||
        (activeChallenge.playerSlot === 2 && activeChallenge.targetCellKey === 'r0_c0'));

    const updatedGridState: PersistedGridState = {
      cells: updatedCells,
      activeChallenges: updatedActiveChallenges,
      completedChallengeIds: [...currentGridState.completedChallengeIds, challengeId],
      lastCapturedCellKey: activeChallenge.targetCellKey,
    };

    return {
      success: true,
      challengeId,
      targetCellKey: activeChallenge.targetCellKey,
      accuracy,
      wpm,
      minAccuracyRequired: activeChallenge.minAccuracy,
      isCapitalCapture: isEnemyCapital,
      winnerId: isEnemyCapital ? userId : null,
      gridState: updatedGridState,
    };
  }

  /**
   * Evaluates in-flight typing progress snapshot without modifying state.
   */
  static evaluateProgress(
    activeChallenge: ActiveAttackChallenge,
    charsTyped: number,
    now?: number
  ): { progressPercent: number; wpm: number } {
    const timestamp = now ?? Date.now();
    const totalChars = Math.max(activeChallenge.passageText.length, 1);
    const clampedChars = Math.min(Math.max(0, charsTyped), totalChars);
    const progressPercent = Math.min(100, Math.round((clampedChars / totalChars) * 1000) / 10);

    const elapsedMs = Math.max(500, timestamp - activeChallenge.startedAt);
    const elapsedMinutes = elapsedMs / 60000;
    const netWords = clampedChars / 5;
    const wpm = Math.max(0, Math.round((netWords / elapsedMinutes) * 10) / 10);

    return { progressPercent, wpm };
  }

  /**
   * Computes the length of the Longest Common Subsequence between two strings.
   * Space-optimized O(min(m, n)) DP algorithm for fast resilient typing accuracy matching.
   */
  static computeLcsLength(s1: string, s2: string): number {
    if (s1 === s2) return s1.length;
    const m = s1.length;
    const n = s2.length;
    if (m === 0 || n === 0) return 0;

    const [shortStr, longStr] = m < n ? [s1, s2] : [s2, s1];
    const shortLen = shortStr.length;
    const longLen = longStr.length;

    let prev = new Uint16Array(shortLen + 1);
    let curr = new Uint16Array(shortLen + 1);

    for (let i = 1; i <= longLen; i++) {
      const charLong = longStr.charCodeAt(i - 1);
      for (let j = 1; j <= shortLen; j++) {
        if (charLong === shortStr.charCodeAt(j - 1)) {
          curr[j] = prev[j - 1] + 1;
        } else {
          curr[j] = Math.max(prev[j], curr[j - 1]);
        }
      }
      const temp = prev;
      prev = curr;
      curr = temp;
      curr.fill(0);
    }

    return prev[shortLen];
  }
}
