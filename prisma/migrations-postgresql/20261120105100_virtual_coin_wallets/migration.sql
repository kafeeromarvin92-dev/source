CREATE TYPE "CoinTransactionType" AS ENUM (
    'STARTER_GRANT',
    'ADMIN_GRANT',
    'MATCH_STAKE',
    'MATCH_PAYOUT',
    'HOUSE_FEE',
    'MATCH_REFUND'
);

ALTER TABLE "Challenge"
    ADD COLUMN "entryStake" INTEGER NOT NULL DEFAULT 100,
    ADD COLUMN "stakesCollectedAt" TIMESTAMP(3);

ALTER TABLE "Challenge"
    ADD CONSTRAINT "Challenge_entryStake_check"
    CHECK ("entryStake" IN (100, 200, 500));

CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "userId" TEXT,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Wallet_balance_check" CHECK ("balance" >= 0)
);

CREATE UNIQUE INDEX "Wallet_accountKey_key" ON "Wallet"("accountKey");
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

ALTER TABLE "Wallet"
    ADD CONSTRAINT "Wallet_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Wallet" ("id", "accountKey", "userId", "balance", "createdAt", "updatedAt")
SELECT
    'wallet:' || "id",
    'player:' || "id",
    "id",
    1000,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User";

INSERT INTO "Wallet" ("id", "accountKey", "balance", "createdAt", "updatedAt")
VALUES ('wallet:house:treasury', 'house:treasury', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

CREATE TABLE "CoinTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "challengeId" TEXT,
    "createdById" TEXT,
    "type" "CoinTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "referenceKey" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoinTransaction_referenceKey_key" ON "CoinTransaction"("referenceKey");
CREATE INDEX "CoinTransaction_walletId_createdAt_idx" ON "CoinTransaction"("walletId", "createdAt");
CREATE INDEX "CoinTransaction_challengeId_type_idx" ON "CoinTransaction"("challengeId", "type");

ALTER TABLE "CoinTransaction"
    ADD CONSTRAINT "CoinTransaction_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "Wallet"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CoinTransaction"
    ADD CONSTRAINT "CoinTransaction_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CoinTransaction"
    ADD CONSTRAINT "CoinTransaction_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "CoinTransaction" (
    "id",
    "walletId",
    "type",
    "amount",
    "referenceKey",
    "note",
    "createdAt"
)
SELECT
    md5('starter:' || "User"."id"),
    "Wallet"."id",
    'STARTER_GRANT',
    1000,
    'starter:migration:' || "User"."id",
    'Launch starter balance',
    CURRENT_TIMESTAMP
FROM "User"
JOIN "Wallet" ON "Wallet"."userId" = "User"."id";
