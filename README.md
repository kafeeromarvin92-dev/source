# Noble Gamers

Noble Gamers is a mobile-first DLS competition app built with Next.js 16, React 19, Tailwind CSS 4, Prisma 7, and PostgreSQL on Neon. Players can challenge opponents, submit results for review, manage virtual coins, and enter single-elimination tournaments.

## Run locally

Requirements: Node.js and npm.

1. Copy `.env.example` to `.env` and set `DATABASE_URL` (pooled PostgreSQL) and `DATABASE_URL_UNPOOLED` (direct PostgreSQL). Keep credentials out of source control.
2. Install dependencies and start the development server:

   ```powershell
   npm.cmd ci
   npm.cmd run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

Prisma Client is generated during install. To regenerate it manually after a schema change:

```powershell
npm.cmd exec prisma generate
```

## Main areas

- `/` — player lobby, online players, challenges, and match links.
- `/matches`, `/match/[id]`, `/results` — existing challenge and result-review flow.
- `/tournaments` and `/tournaments/[id]` — tournament listing, joining, and bracket.
- `/admin/tournaments`, `/admin/tournaments/new`, `/admin/tournaments/[id]` — admin tournament management.
- `/wallet`, `/leaderboard`, `/profile` — player account and standings.

The mobile bottom navigation provides Play, Tournaments, Ranks, and Me; Matches remains linked from Play. Admins also get a gold Admin shortcut.

## Player accounts and challenges

Google sign-in is not required. Players register with a username, email, and password, then log back in with either their username or email and password. Passwords are stored as bcrypt hashes; the app never stores the plain password. Sessions last 30 days and use an HTTP-only, same-site cookie; session tokens are hashed in the database, and cookies are marked secure in production. Password reset is not self-service yet; players who forget a password need administrator help.

When a challenge is accepted, the app assigns one shared random match code (two uppercase letters and one digit) for both players. It is visible only to the match participants and administrators while the match is being played. The admin control room shows accepted matches separately from the result-review queue, which only contains matches with submitted evidence, disputes, or a settled result.

## Tournament release

Admins create 4-, 8-, 16-, or 32-player single-elimination events, set entry fees and a prize split, and choose a start time. Players join an open event; the fee debit, seed assignment, bracket advancement, and final prize payments are transactional and recorded in the coin ledger. The final prize-split remainder goes to the winner.

In this release, admins start a full bracket after its scheduled time and record tournament match results. Tournament ready checks, screenshot/dispute automation, automated timeout forfeits, push nudges, and reliability scoring are not enabled. Existing challenge settlement, first-sender, and dispute behavior is unchanged.

## Database and deployment

PostgreSQL schema and migrations live in `prisma/schema.prisma` and `prisma/migrations-postgresql`. Before deploying, confirm the target database and take a backup, then apply pending migrations:

```powershell
npm.cmd exec prisma migrate deploy
```

The wallet migration creates player wallets and a transaction ledger, and grants existing accounts their launch balance. The tournament migration adds tournament, entry, match, and tournament-ledger records. Never apply migrations to an unintended database.

To import active tables from local `dev.db` into a newly migrated, empty Neon database, first make and verify a backup. The importer refuses to write when target application tables are not empty:

```powershell
Copy-Item -LiteralPath .\dev.db -Destination .\backups\dev.db.before-neon.db
npm.cmd run db:import-sqlite
```

Local media is stored under `.data/objects`; configure persistent object storage before deploying to a serverless host. The bootstrap command only promotes an existing account:

```powershell
npm.cmd run admin:bootstrap -- --email=existing-account@example.com
```

## Checks

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd exec tsc -- --noEmit
npm.cmd exec prisma validate
npm.cmd run build
```
