-- CreateTable
CREATE TABLE IF NOT EXISTS "ConquestMatch" (
    "id" TEXT NOT NULL,
    "matchCode" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "mapSeed" TEXT NOT NULL,
    "gridState" TEXT,
    "currentTurn" INTEGER NOT NULL DEFAULT 1,
    "winnerId" TEXT,
    "finishedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConquestMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ConquestParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seat" INTEGER NOT NULL,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "outcome" TEXT,
    "territoriesCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConquestParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ConquestMatch_matchCode_key" ON "ConquestMatch"("matchCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConquestMatch_status_idx" ON "ConquestMatch"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConquestMatch_creatorId_idx" ON "ConquestMatch"("creatorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConquestMatch_matchCode_idx" ON "ConquestMatch"("matchCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConquestMatch_createdAt_idx" ON "ConquestMatch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ConquestParticipant_matchId_userId_key" ON "ConquestParticipant"("matchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ConquestParticipant_matchId_seat_key" ON "ConquestParticipant"("matchId", "seat");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConquestParticipant_userId_idx" ON "ConquestParticipant"("userId");

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConquestMatch_creatorId_fkey') THEN
        ALTER TABLE "ConquestMatch" ADD CONSTRAINT "ConquestMatch_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConquestParticipant_matchId_fkey') THEN
        ALTER TABLE "ConquestParticipant" ADD CONSTRAINT "ConquestParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ConquestMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConquestParticipant_userId_fkey') THEN
        ALTER TABLE "ConquestParticipant" ADD CONSTRAINT "ConquestParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
