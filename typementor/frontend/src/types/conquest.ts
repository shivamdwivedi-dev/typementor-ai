/**
 * Word Conquest — Frontend Domain Types
 */

export type TerritoryType = 'CAPITAL' | 'FORTRESS' | 'NEUTRAL';
export type PlayerSlot = 1 | 2; // 1 = Blue (Top-Left 0,0), 2 = Red (Bottom-Right 5,5)

export interface Coordinate {
  row: number;
  col: number;
}

export interface TerritoryCell {
  id: string; // e.g. "r0_c0"
  row: number;
  col: number;
  type: TerritoryType;
  owner: PlayerSlot | null;
  name: string;
  defenseBonus: number;
}

export interface ConquestBoard {
  gridSize: number; // 6
  totalCells: number; // 36
  cells: TerritoryCell[];
  cellMap: Record<string, TerritoryCell>;
  capitals: {
    player1: Coordinate;
    player2: Coordinate;
  };
  fortresses: Coordinate[];
}

export type ChallengeTerritoryType =
  | 'NEUTRAL'
  | 'FORTRESS'
  | 'ENEMY_TERRITORY'
  | 'ENEMY_CAPITAL';

export type DifficultyTier = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

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
  startedAt: number;
  deadlineAt: number;
}

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

export type ConquestMatchStatus =
  | 'WAITING'
  | 'READY'
  | 'ACTIVE'
  | 'FINISHED'
  | 'CANCELLED';

export interface PublicConquestMatch {
  id: string;
  matchCode: string;
  creatorId: string;
  status: ConquestMatchStatus;
  mapSeed: string;
  currentTurn: number;
  winnerId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  participants: PublicConquestParticipant[];
  board: ConquestBoard;
  activeChallenge: ActiveAttackChallenge | null;
}

export type ConquestClientEvent =
  | 'CONQUEST_PING'
  | 'CONQUEST_JOIN_ROOM'
  | 'CONQUEST_READY'
  | 'CONQUEST_ATTACK_START'
  | 'CONQUEST_ATTACK_PROGRESS'
  | 'CONQUEST_CHALLENGE_SUBMIT';

export type ConquestServerEvent =
  | 'CONQUEST_PONG'
  | 'CONQUEST_ROOM_JOINED'
  | 'CONQUEST_PLAYER_READY'
  | 'CONQUEST_MATCH_STARTED'
  | 'CONQUEST_ATTACK_ASSIGNED'
  | 'CONQUEST_OPPONENT_ATTACK_STARTED'
  | 'CONQUEST_OPPONENT_PROGRESS'
  | 'CONQUEST_TERRITORY_CAPTURED'
  | 'CONQUEST_ATTACK_FAILED'
  | 'CONQUEST_PLAYER_DISCONNECTED'
  | 'CONQUEST_PLAYER_RECONNECTED'
  | 'CONQUEST_MATCH_FINISHED'
  | 'CONQUEST_ERROR';
