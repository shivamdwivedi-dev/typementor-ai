/**
 * Word Conquest — Domain Types
 * 
 * Coordinate Convention:
 * (row, col) where:
 * - row: 0 (Northernmost / Top) to 5 (Southernmost / Bottom)
 * - col: 0 (Westernmost / Left) to 5 (Easternmost / Right)
 * Total: 6 rows * 6 columns = 36 cells.
 */

export type TerritoryType = 'CAPITAL' | 'FORTRESS' | 'NEUTRAL';
export type PlayerSlot = 1 | 2; // 1 = Blue (Top-Left 0,0), 2 = Red (Bottom-Right 5,5)

export interface Coordinate {
  row: number;
  col: number;
}

export interface TerritoryCell {
  id: string; // e.g. "r0_c0"
  row: number; // 0..5
  col: number; // 0..5
  type: TerritoryType;
  owner: PlayerSlot | null; // 1, 2, or null (unclaimed neutral/fortress)
  name: string; // Thematic identifier, e.g. "North Bastion"
  defenseBonus: number; // Base defense modifier (0 for Neutral, 2 for Fortress, 5 for Capital)
}

export interface ConquestMap {
  seed: string;
  gridSize: number; // 6
  totalCells: number; // 36
  cells: TerritoryCell[];
  cellMap: Record<string, TerritoryCell>; // Fast lookup by "r{row}_c{col}"
  capitals: {
    player1: Coordinate; // Always (0, 0)
    player2: Coordinate; // Always (5, 5)
  };
  fortresses: Coordinate[]; // Exactly 4 coordinates
}

export interface MoveValidationResult {
  canTarget: boolean;
  reason?: string;
}

/**
 * Challenge Target Territory Context
 * - NEUTRAL: Unclaimed neutral territory (Tier 1: Easy / Skirmish)
 * - FORTRESS: Defended neutral bastion with built-in defense bonus (Tier 2: Medium / Siege)
 * - ENEMY_TERRITORY: Territory currently held by opposing player (Tier 3: Hard / Reconquest)
 * - ENEMY_CAPITAL: Enemy player's starting capital citadel (Tier 4: Expert / Citadel Assault)
 */
export type ChallengeTerritoryType =
  | 'NEUTRAL'
  | 'FORTRESS'
  | 'ENEMY_TERRITORY'
  | 'ENEMY_CAPITAL';

export type DifficultyTier = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export interface ChallengeDifficultyRule {
  territoryType: ChallengeTerritoryType;
  tier: DifficultyTier;
  defenseModifier: number;
  minAccuracy: number;
  targetWordCountRange: [number, number];
  description: string;
}

export interface PassageMetrics {
  wordCount: number;
  charCount: number;
  averageWordLength: number;
  punctuationCount: number;
}

export interface ConquestPassage extends PassageMetrics {
  id: string;
  title: string;
  tier: DifficultyTier;
  text: string;
}

export interface ChallengeGenerationParams {
  challengeSeed: string;
  territoryType: ChallengeTerritoryType;
  targetCellKey?: string;
  turn?: number;
  attemptIndex?: number;
}

export interface ConquestChallenge {
  challengeId: string;
  territoryType: ChallengeTerritoryType;
  targetCellKey: string;
  difficultyTier: DifficultyTier;
  passageId: string;
  passageTitle: string;
  passageText: string;
  wordCount: number;
  charCount: number;
  averageWordLength: number;
  defenseModifier: number;
  minAccuracy: number;
  challengeSeed: string;
}

/**
 * Match Lifecycle States
 */
export type ConquestMatchStatus =
  | 'WAITING'
  | 'READY'
  | 'ACTIVE'
  | 'FINISHED'
  | 'CANCELLED';

/**
 * Active Attack Challenge in Flight (75-second limit)
 */
export interface ActiveAttackChallenge {
  challengeId: string;
  userId: string;
  playerSlot: PlayerSlot;
  targetCellKey: string;
  territoryType: ChallengeTerritoryType;
  difficultyTier: DifficultyTier;
  passageId: string;
  passageTitle: string;
  passageText: string;
  wordCount: number;
  charCount: number;
  defenseModifier: number;
  minAccuracy: number;
  startedAt: number; // Unix timestamp ms
  deadlineAt: number; // startedAt + 75_000 ms
}

/**
 * Persisted JSON state structure stored in ConquestMatch.gridState
 */
export interface PersistedGridState {
  cells: Record<string, TerritoryCell>;
  activeChallenges: Record<string, ActiveAttackChallenge | null>; // keyed by userId
  completedChallengeIds: string[];
  lastCapturedCellKey?: string;
}

/**
 * Public participant structure for frontend consumption
 */
export interface PublicConquestParticipant {
  id: string;
  userId: string;
  seat: number;
  isReady: boolean;
  isConnected: boolean;
  territoriesCount: number;
  outcome?: string | null;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
    level?: number;
  };
}

/**
 * Public match details payload
 */
export interface PublicConquestMatch {
  id: string;
  matchCode: string;
  creatorId: string;
  status: ConquestMatchStatus;
  mapSeed: string;
  currentTurn: number;
  winnerId?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  participants: PublicConquestParticipant[];
  board: {
    gridSize: number;
    totalCells: number;
    cells: TerritoryCell[];
    cellMap: Record<string, TerritoryCell>;
    capitals: {
      player1: Coordinate;
      player2: Coordinate;
    };
    fortresses: Coordinate[];
  };
  activeChallenge?: ActiveAttackChallenge | null;
}

/**
 * Challenge submission evaluation result
 */
export interface AttackSubmissionResult {
  success: boolean;
  reason?: string;
  challengeId: string;
  targetCellKey: string;
  accuracy: number;
  wpm: number;
  minAccuracyRequired: number;
  isCapitalCapture: boolean;
  winnerId?: string | null;
  gridState: PersistedGridState;
}

/**
 * Client Socket Message Protocol
 */
export type ConquestClientEvent =
  | 'CONQUEST_JOIN_ROOM'
  | 'CONQUEST_READY'
  | 'CONQUEST_ATTACK_START'
  | 'CONQUEST_ATTACK_PROGRESS'
  | 'CONQUEST_CHALLENGE_SUBMIT'
  | 'CONQUEST_PING';

export interface ConquestClientMessage {
  type: ConquestClientEvent;
  payload?: any;
  reqId?: string;
}

/**
 * Server Socket Message Protocol
 */
export type ConquestServerEvent =
  | 'CONQUEST_ROOM_JOINED'
  | 'CONQUEST_PLAYER_JOINED'
  | 'CONQUEST_PLAYER_READY'
  | 'CONQUEST_COUNTDOWN_TICK'
  | 'CONQUEST_MATCH_STARTED'
  | 'CONQUEST_ATTACK_ASSIGNED'
  | 'CONQUEST_OPPONENT_ATTACK_STARTED'
  | 'CONQUEST_OPPONENT_PROGRESS'
  | 'CONQUEST_TERRITORY_CAPTURED'
  | 'CONQUEST_ATTACK_FAILED'
  | 'CONQUEST_ATTACK_CANCELLED'
  | 'CONQUEST_PLAYER_DISCONNECTED'
  | 'CONQUEST_PLAYER_RECONNECTED'
  | 'CONQUEST_MATCH_FINISHED'
  | 'CONQUEST_ERROR'
  | 'CONQUEST_PONG';

export interface ConquestServerMessage {
  type: ConquestServerEvent;
  payload?: any;
  resId?: string;
}


