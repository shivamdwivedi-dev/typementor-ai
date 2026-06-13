/**
 * Local type mirrors of Prisma models.
 * These match the schema exactly and are used instead of importing from
 * @prisma/client, which only exports types AFTER `npx prisma generate` runs.
 *
 * Run `npx prisma generate` once and these can optionally be replaced with
 * direct @prisma/client imports.
 */

export interface KeystrokeLog {
  id: string;
  sessionId: string;
  expectedKey: string;
  actualKey: string;
  reactionTime: number;
  holdTime: number;
  pauseDuration: number;
  wordIndex: number;
  previousKey: string | null;
  nextKey: string | null;
  isMistake: boolean;
  timestamp: Date;
}

export interface MistakeSummary {
  id: string;
  userId: string;
  expectedKey: string;
  pressedKey: string;
  count: number;
  updatedAt: Date;
}

export interface Challenge {
  id: string;
  type: string;
  title: string;
  description: string;
  criteriaType: string;
  targetValue: number;
  xpReward: number;
  expiresAt: Date;
  createdAt: Date;
}
