-- Add virtual currency and Gemini verification state while retaining legacy wallet data.
ALTER TABLE "User" ADD COLUMN "nobleCoins" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "Challenge" ADD COLUMN "entryFeeCoins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Challenge" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
