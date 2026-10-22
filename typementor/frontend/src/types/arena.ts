export type ArenaMatchStatus =
  | 'WAITING'
  | 'READY'
  | 'COUNTDOWN'
  | 'ACTIVE'
  | 'FINISHED'
  | 'CANCELLED'
  | 'EXPIRED';

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
  passageText?: string;
  participants: PublicParticipantInfo[];
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
