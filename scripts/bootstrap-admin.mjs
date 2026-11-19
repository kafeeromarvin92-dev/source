import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import pg from "pg";

const { Pool } = pg;

const emailArg = process.argv.find((value) => value.startsWith("--email="))?.slice("--email=".length).trim().toLowerCase();
if (!emailArg || !/^\S+@\S+\.\S+$/.test(emailArg)) { console.error("Usage: npm run admin:bootstrap -- --email=registered-address@example.com"); process.exit(2); }
const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "file:./dev.db";

if (databaseUrl.startsWith("file:")) {
  const databasePath = path.resolve(process.cwd(), databaseUrl.slice("file:".length).split("?")[0]);
  if (!fs.existsSync(databasePath)) { console.error(`Database file not found: ${databasePath}`); process.exit(1); }
  const db = new Database(databasePath);
  try {
    const user = db.prepare("SELECT id, username, email, isAdmin FROM User WHERE lower(email) = ?").get(emailArg);
    if (!user) { console.error("No registered account with that email exists in this database. No account was created or changed."); process.exitCode = 1; }
    else if (user.isAdmin) console.log(`Already an admin: ${user.username} <${user.email}>`);
    else { db.prepare("UPDATE User SET isAdmin = 1 WHERE id = ?").run(user.id); console.log(`Promoted existing account: ${user.username} <${user.email}>`); }
  } finally { db.close(); }
} else if (/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const { rows } = await pool.query(
      'SELECT "id", "username", "email", "isAdmin" FROM "User" WHERE lower("email") = $1',
      [emailArg],
    );
    const user = rows[0];
    if (!user) { console.error("No registered account with that email exists in this database. No account was created or changed."); process.exitCode = 1; }
    else if (user.isAdmin) console.log(`Already an admin: ${user.username} <${user.email}>`);
    else {
      await pool.query('UPDATE "User" SET "isAdmin" = TRUE WHERE "id" = $1', [user.id]);
      console.log(`Promoted existing account: ${user.username} <${user.email}>`);
    }
  } finally {
    await pool.end();
  }
} else {
  console.error("DATABASE_URL must use file: for SQLite or postgresql:// for PostgreSQL.");
  process.exitCode = 2;
}
