ALTER TYPE "CoinTransactionType" ADD VALUE 'TOURNAMENT_ENTRY';
ALTER TYPE "CoinTransactionType" ADD VALUE 'TOURNAMENT_PAYOUT';
ALTER TYPE "CoinTransactionType" ADD VALUE 'TOURNAMENT_REFUND';

CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'OPEN', 'LIVE', 'FINISHED');
CREATE TYPE "TournamentEntryStatus" AS ENUM ('JOINED', 'ELIMINATED', 'CHAMPION');
CREATE TYPE "TournamentMatchStatus" AS ENUM ('WAITING', 'READY', 'PLAYING', 'AWAITING_SCREENSHOT', 'DISPUTED', 'DONE', 'FORFEIT');
CREATE TYPE "TournamentFormat" AS ENUM ('SINGLE_ELIMINATION');

ALTER TABLE "CoinTransaction" ADD COLUMN "tournamentId" TEXT;

CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "game" TEXT NOT NULL DEFAULT 'DLS',
    "size" INTEGER NOT NULL,
    "entryFee" INTEGER NOT NULL,
    "prizeSplit" JSONB NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "format" "TournamentFormat" NOT NULL DEFAULT 'SINGLE_ELIMINATION',
    "bestOf" INTEGER NOT NULL DEFAULT 1,
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Tournament_size_check" CHECK ("size" IN (4, 8, 16, 32)),
    CONSTRAINT "Tournament_entryFee_check" CHECK ("entryFee" IN (0, 100, 500, 1000, 5000)),
    CONSTRAINT "Tournament_bestOf_check" CHECK ("bestOf" IN (1, 3))
);

CREATE TABLE "TournamentEntry" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "teamLogo" TEXT,
    "seed" INTEGER NOT NULL,
    "status" "TournamentEntryStatus" NOT NULL DEFAULT 'JOINED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TournamentEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TournamentMatch" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "roundLabel" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "playerAId" TEXT,
    "playerBId" TEXT,
    "challengeCode" TEXT,
    "status" "TournamentMatchStatus" NOT NULL DEFAULT 'WAITING',
    "scoreA" INTEGER,
    "scoreB" INTEGER,
    "winnerId" TEXT,
    "settledByAdminId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "TournamentMatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentMatch_challengeCode_key" ON "TournamentMatch"("challengeCode");
CREATE UNIQUE INDEX "TournamentEntry_tournamentId_userId_key" ON "TournamentEntry"("tournamentId", "userId");
CREATE UNIQUE INDEX "TournamentEntry_tournamentId_seed_key" ON "TournamentEntry"("tournamentId", "seed");
CREATE UNIQUE INDEX "TournamentMatch_tournamentId_round_position_key" ON "TournamentMatch"("tournamentId", "round", "position");
CREATE INDEX "Tournament_status_startAt_idx" ON "Tournament"("status", "startAt");
CREATE INDEX "TournamentEntry_userId_status_idx" ON "TournamentEntry"("userId", "status");
CREATE INDEX "TournamentMatch_playerAId_idx" ON "TournamentMatch"("playerAId");
CREATE INDEX "TournamentMatch_playerBId_idx" ON "TournamentMatch"("playerBId");
CREATE INDEX "TournamentMatch_winnerId_idx" ON "TournamentMatch"("winnerId");
CREATE INDEX "TournamentMatch_settledByAdminId_idx" ON "TournamentMatch"("settledByAdminId");
CREATE INDEX "CoinTransaction_tournamentId_type_idx" ON "CoinTransaction"("tournamentId", "type");

ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_createdByAdminId_fkey"
    FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TournamentEntry" ADD CONSTRAINT "TournamentEntry_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentEntry" ADD CONSTRAINT "TournamentEntry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_playerAId_fkey"
    FOREIGN KEY ("playerAId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_playerBId_fkey"
    FOREIGN KEY ("playerBId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_winnerId_fkey"
    FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_settledByAdminId_fkey"
    FOREIGN KEY ("settledByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;
