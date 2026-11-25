-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('WEBHOOK', 'RECONCILER');

-- CreateTable
CREATE TABLE "ChainEvent" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTimestamp" TIMESTAMP(3) NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "args" JSONB NOT NULL,
    "source" "EventSource" NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Election" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "options" TEXT[],
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "allowlistOnly" BOOLEAN NOT NULL,
    "creator" TEXT NOT NULL,
    "createdEventId" TEXT NOT NULL,
    "cancelledEventId" TEXT,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "electionId" INTEGER NOT NULL,
    "voter" TEXT NOT NULL,
    "option" INTEGER NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "castAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voter" (
    "electionId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "Voter_pkey" PRIMARY KEY ("electionId","address")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "logCount" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastConfirmedBlock" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChainEvent_blockNumber_idx" ON "ChainEvent"("blockNumber");

-- CreateIndex
CREATE INDEX "ChainEvent_confirmed_blockNumber_idx" ON "ChainEvent"("confirmed", "blockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Election_createdEventId_key" ON "Election"("createdEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Election_cancelledEventId_key" ON "Election"("cancelledEventId");

-- CreateIndex
CREATE INDEX "Election_endTime_idx" ON "Election"("endTime");

-- CreateIndex
CREATE INDEX "Vote_voter_idx" ON "Vote"("voter");

-- CreateIndex
CREATE INDEX "Vote_electionId_option_idx" ON "Vote"("electionId", "option");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_electionId_voter_key" ON "Vote"("electionId", "voter");

-- AddForeignKey
ALTER TABLE "Election" ADD CONSTRAINT "Election_createdEventId_fkey" FOREIGN KEY ("createdEventId") REFERENCES "ChainEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Election" ADD CONSTRAINT "Election_cancelledEventId_fkey" FOREIGN KEY ("cancelledEventId") REFERENCES "ChainEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_id_fkey" FOREIGN KEY ("id") REFERENCES "ChainEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voter" ADD CONSTRAINT "Voter_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voter" ADD CONSTRAINT "Voter_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ChainEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
