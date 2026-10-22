-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "arenaPoints" INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArenaMatch" (
    "id" TEXT NOT NULL,
    "matchCode" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "passageId" TEXT NOT NULL,
    "passageText" TEXT NOT NULL,
    "passageTitle" TEXT NOT NULL,
    "passageWordCount" INTEGER NOT NULL,
    "stakeAmount" INTEGER NOT NULL DEFAULT 0,
    "isRanked" BOOLEAN NOT NULL DEFAULT false,
    "maxDuration" INTEGER NOT NULL DEFAULT 120,
    "countdownSeconds" INTEGER NOT NULL DEFAULT 5,
    "winnerId" TEXT,
    "isTie" BOOLEAN NOT NULL DEFAULT false,
    "settlementStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "cancellationReason" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ArenaMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArenaParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seat" INTEGER NOT NULL,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "lastPingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "charsTyped" INTEGER NOT NULL DEFAULT 0,
    "wpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "completionTimeMs" INTEGER,
    "outcome" TEXT,
    "stakeLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArenaPointLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaPointLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ArenaMatch_matchCode_key" ON "ArenaMatch"("matchCode");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ArenaMatch_idempotencyKey_key" ON "ArenaMatch"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArenaMatch_status_idx" ON "ArenaMatch"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArenaMatch_creatorId_idx" ON "ArenaMatch"("creatorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArenaMatch_matchCode_idx" ON "ArenaMatch"("matchCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArenaMatch_createdAt_idx" ON "ArenaMatch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ArenaParticipant_matchId_userId_key" ON "ArenaParticipant"("matchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ArenaParticipant_matchId_seat_key" ON "ArenaParticipant"("matchId", "seat");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArenaParticipant_userId_idx" ON "ArenaParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ArenaPointLedger_idempotencyKey_key" ON "ArenaPointLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArenaPointLedger_userId_idx" ON "ArenaPointLedger"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArenaPointLedger_matchId_idx" ON "ArenaPointLedger"("matchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArenaPointLedger_createdAt_idx" ON "ArenaPointLedger"("createdAt");

-- AddForeignKey
ALTER TABLE "ArenaMatch" ADD CONSTRAINT "ArenaMatch_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaParticipant" ADD CONSTRAINT "ArenaParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaParticipant" ADD CONSTRAINT "ArenaParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaPointLedger" ADD CONSTRAINT "ArenaPointLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaPointLedger" ADD CONSTRAINT "ArenaPointLedger_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
