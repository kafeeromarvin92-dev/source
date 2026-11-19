-- Preserve old monetary data for audit/history, then remove it from the active schema.
CREATE TABLE "LegacyUserMonetaryData" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "walletBalance" INTEGER,
    "nobleCoins" INTEGER,
    "archivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "LegacyUserMonetaryData" ("userId", "walletBalance", "nobleCoins")
SELECT "id", "walletBalance", "nobleCoins" FROM "User";

CREATE TABLE "LegacyChallengeMonetaryData" (
    "challengeId" TEXT NOT NULL PRIMARY KEY,
    "stakeAmount" INTEGER,
    "entryFeeCoins" INTEGER,
    "archivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "LegacyChallengeMonetaryData" ("challengeId", "stakeAmount", "entryFeeCoins")
SELECT "id", "stakeAmount", "entryFeeCoins" FROM "Challenge";

CREATE TABLE "LegacyLedgerEntry" AS SELECT * FROM "LedgerEntry";
CREATE TABLE "LegacyWalletTransaction" AS SELECT * FROM "WalletTransaction";

DROP TABLE "LedgerEntry";
DROP TABLE "WalletTransaction";
ALTER TABLE "User" DROP COLUMN "walletBalance";
ALTER TABLE "User" DROP COLUMN "nobleCoins";
ALTER TABLE "Challenge" DROP COLUMN "stakeAmount";
ALTER TABLE "Challenge" DROP COLUMN "entryFeeCoins";

ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "gameTags" TEXT NOT NULL DEFAULT 'DLS';
ALTER TABLE "User" ADD COLUMN "country" TEXT;
ALTER TABLE "MatchDecision" ADD COLUMN "proposedWinnerId" TEXT;
ALTER TABLE "MatchDecision" ADD COLUMN "confirmedById" TEXT;
ALTER TABLE "MatchDecision" ADD COLUMN "confirmedAt" DATETIME;
