import "dotenv/config";
import path from "node:path";
import Database from "better-sqlite3";
import pg from "pg";

const { Pool } = pg;
const sourcePath = path.resolve(process.env.SQLITE_DATABASE_PATH || "./dev.db");
const databaseUrl = process.env.DATABASE_URL_UNPOOLED;

if (!databaseUrl) throw new Error("DATABASE_URL_UNPOOLED must be set.");
if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  throw new Error("DATABASE_URL_UNPOOLED must be a PostgreSQL connection string.");
}
if (new URL(databaseUrl).hostname.includes("-pooler.")) {
  throw new Error("Use the direct, unpooled DATABASE_URL_UNPOOLED connection string.");
}

const tables = [
  {
    name: "User",
    columns: ["id", "username", "teamName", "email", "passwordHash", "avatar", "isAdmin", "bio", "gameTags", "country", "createdAt", "lastSeenAt"],
    booleans: ["isAdmin"],
  },
  {
    name: "Challenge",
    columns: ["id", "verified", "status", "createdAt", "creatorId", "acceptedById"],
    booleans: ["verified"],
  },
  {
    name: "Notification",
    columns: ["id", "userId", "title", "message", "kind", "readAt", "createdAt"],
  },
  {
    name: "FriendRequest",
    columns: ["id", "requesterId", "recipientId", "status", "createdAt"],
  },
  {
    name: "Session",
    columns: ["id", "tokenHash", "userId", "expiresAt", "createdAt"],
  },
  {
    name: "MatchMessage",
    columns: ["id", "challengeId", "senderId", "text", "createdAt"],
  },
  {
    name: "PlayerCode",
    columns: ["id", "challengeId", "playerId", "code", "createdAt"],
  },
  {
    name: "Submission",
    columns: ["id", "challengeId", "playerId", "image", "createdAt"],
  },
  {
    name: "MatchDecision",
    columns: ["id", "challengeId", "status", "winnerId", "proposedWinnerId", "confirmedById", "confirmedAt", "confidence", "reasoning", "creatorScore", "acceptedByScore", "decidedById", "decidedAt"],
  },
  {
    name: "Objection",
    columns: ["id", "challengeId", "playerId", "reason", "createdAt"],
  },
];

const dateColumns = new Set(["createdAt", "lastSeenAt", "readAt", "expiresAt", "confirmedAt", "decidedAt"]);
const sqlite = new Database(sourcePath, { readonly: true, fileMustExist: true });
const pool = new Pool({ connectionString: databaseUrl, max: 1 });

function convertValue(table, column, value) {
  if (value === null || value === undefined) return null;
  if (table.booleans?.includes(column)) return Boolean(value);
  if (dateColumns.has(column)) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid date in SQLite ${table.name}.${column}.`);
    }
    return date;
  }
  return value;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const table of tables) {
      const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM "${table.name}"`);
      if (rows[0].count !== 0) {
        throw new Error(`Neon table "${table.name}" is not empty; refusing to import over existing data.`);
      }
    }

    const imported = {};
    for (const table of tables) {
      const rows = sqlite.prepare(`SELECT ${table.columns.map((column) => `"${column}"`).join(", ")} FROM "${table.name}"`).all();
      const insert = `INSERT INTO "${table.name}" (${table.columns.map((column) => `"${column}"`).join(", ")}) VALUES (${table.columns.map((_, index) => `$${index + 1}`).join(", ")})`;
      for (const row of rows) {
        await client.query(insert, table.columns.map((column) => convertValue(table, column, row[column])));
      }
      imported[table.name] = rows.length;
    }

    for (const table of tables) {
      const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM "${table.name}"`);
      if (rows[0].count !== imported[table.name]) {
        throw new Error(`Row count mismatch after importing "${table.name}".`);
      }
    }
    await client.query("COMMIT");
    for (const table of tables) console.log(`${table.name}: ${imported[table.name]} rows`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

main().catch((error) => {
  console.error("SQLite to Neon import failed:", error.message);
  process.exitCode = 1;
});
