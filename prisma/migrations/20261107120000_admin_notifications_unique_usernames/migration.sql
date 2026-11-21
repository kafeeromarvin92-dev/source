UPDATE "User"
SET "username" = lower("username")
WHERE "username" != lower("username");

UPDATE "User"
SET "username" = lower("username") || '_' || substr("id", 1, 6)
WHERE "id" IN (
    SELECT first."id"
    FROM "User" AS first
    JOIN "User" AS duplicate ON lower(first."username") = lower(duplicate."username") AND first."id" > duplicate."id"
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'INFO',
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
