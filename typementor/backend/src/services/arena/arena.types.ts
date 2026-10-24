export type ArenaMatchStatus =
  | 'WAITING'
  | 'READY'
  | 'COUNTDOWN'
  | 'ACTIVE'
  | 'FINISHED'
  | 'CANCELLED'
  | 'EXPIRED';

export type ArenaParticipantOutcome =
  | 'WIN'
  | 'LOSS'
  | 'TIE'
  | 'ABANDONED'
  | 'CANCELLED';

export type ArenaLedgerType =
  | 'WELCOME_GRANT'
  | 'STAKE_LOCK'
  | 'MATCH_WIN'
  | 'MATCH_REFUND'
  | 'ADMIN_ADJUSTMENT';

export const ARENA_CONFIG = {
  INITIAL_WELCOME_POINTS: 100,
  MAX_ARENA_STAKE: 500,
  MIN_ARENA_STAKE: 0,
  DEFAULT_COUNTDOWN_SECONDS: 5,
  DEFAULT_MAX_DURATION_SECONDS: 120,
  RECONNECT_GRACE_PERIOD_MS: 15000,
  WAITING_MATCH_EXPIRATION_MS: 10 * 60 * 1000, // 10 minutes
  PROGRESS_THROTTLE_MS: 150, // Minimum interval between progress updates (~6/sec max)
  MAX_TYPING_JUMP_CHARS: 25, // Unrealistic instant progress jump threshold
} as const;

export interface PublicParticipantInfo {
  userId: string;
  name: string;
  avatar?: string | null;
  seat: number;
  isReady: boolean;
  isConnected: boolean;
  progressPercent: number;
  charsTyped: number;
  wpm: number;
  accuracy: number;
  completionTimeMs?: number | null;
  outcome?: string | null;
}

export interface PublicArenaMatch {
  id: string;
  matchCode: string;
  creatorId: string;
  status: ArenaMatchStatus;
  passageTitle: string;
  passageWordCount: number;
  stakeAmount: number;
  isRanked: boolean;
  maxDuration: number;
  countdownSeconds: number;
  winnerId: string | null;
  isTie: boolean;
  settlementStatus: string;
  cancellationReason?: string | null;
  createdAt: string;
  joinedAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  expiresAt?: string | null;
  participants: PublicParticipantInfo[];
  passageText?: string; // Included only when match is active or finished
}

export interface MatchHistoryItem {
  id: string;
  matchCode: string;
  status: ArenaMatchStatus;
  passageTitle: string;
  stakeAmount: number;
  playedAt: string;
  myWpm: number;
  myAccuracy: number;
  myOutcome: string;
  pointsDelta: number;
  opponentName: string;
  opponentWpm: number;
  opponentAccuracy: number;
}

// ── WebSocket Protocol Types ───────────────────────────────────────────────

export type ArenaClientEvent =
  | 'JOIN_MATCH'
  | 'READY_UP'
  | 'PROGRESS_UPDATE'
  | 'SUBMIT_COMPLETION'
  | 'LEAVE_MATCH'
  | 'RESYNC_MATCH'
  | 'PING';

export type ArenaServerEvent =
  | 'MATCH_STATE'
  | 'OPPONENT_JOINED'
  | 'OPPONENT_READY'
  | 'COUNTDOWN_TICK'
  | 'MATCH_STARTED'
  | 'OPPONENT_PROGRESS'
  | 'MATCH_FINISHED'
  | 'OPPONENT_DISCONNECTED'
  | 'OPPONENT_RECONNECTED'
  | 'MATCH_CANCELLED'
  | 'ERROR'
  | 'PONG';

export interface ClientSocketMessage {
  event: ArenaClientEvent;
  reqId?: string;
  payload?: any;
}

export interface ServerSocketMessage {
  event: ArenaServerEvent;
  resId?: string;
  ok?: boolean;
  payload?: any;
  error?: string;
  timestamp: string;
}
