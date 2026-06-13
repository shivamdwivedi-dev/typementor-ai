-- CreateTable
CREATE TABLE "RecoveryHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mostMistypedKey" TEXT NOT NULL,
    "confusionKey" TEXT,
    "accuracyLoss" DOUBLE PRECISION NOT NULL,
    "predictedWpmGain" DOUBLE PRECISION NOT NULL,
    "recoveryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecoveryHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RecoveryHistory" ADD CONSTRAINT "RecoveryHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
