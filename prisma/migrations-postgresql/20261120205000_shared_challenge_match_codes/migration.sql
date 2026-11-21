ALTER TABLE "Challenge" ADD COLUMN "matchCode" TEXT;

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM "Challenge" WHERE "status" = 'ACCEPTED') > 6760 THEN
        RAISE EXCEPTION 'Cannot assign unique three-character match codes to more than 6,760 active challenges.';
    END IF;
END $$;

CREATE UNIQUE INDEX "Challenge_matchCode_key" ON "Challenge"("matchCode");

WITH active_challenges AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (ORDER BY "stakesCollectedAt" NULLS FIRST, "id") - 1 AS code_index
    FROM "Challenge"
    WHERE "status" = 'ACCEPTED'
),
assigned_codes AS (
    SELECT
        "id",
        CHR(65 + ((code_index / 260) % 26)::INTEGER)
            || CHR(65 + ((code_index / 10) % 26)::INTEGER)
            || (code_index % 10)::TEXT AS match_code
    FROM active_challenges
)
UPDATE "Challenge" AS challenge
SET "matchCode" = assigned_codes.match_code
FROM assigned_codes
WHERE challenge."id" = assigned_codes."id";
