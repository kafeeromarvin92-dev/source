This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Google sign-in

Copy the Google OAuth variables from `.env.example` into `.env` and set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`. In Google Cloud Console, create a Web application OAuth client and add the exact redirect URI configured in `GOOGLE_REDIRECT_URI` (for local development, `http://localhost:3000/api/auth/google/callback`). Google sign-in and account creation require a verified `@gmail.com` address.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Neon database

The application uses Neon's pooled `DATABASE_URL` at runtime. Prisma CLI migrations use the direct `DATABASE_URL_UNPOOLED`. Keep both values in an ignored local `.env` file and configure both as secrets in the hosting provider; never commit them.

The PostgreSQL migration history is stored in `prisma/migrations-postgresql`. The original SQLite migrations remain under `prisma/migrations` for reference and are not applied to Neon. Deploy schema changes with:

```powershell
npm.cmd exec prisma migrate deploy
```

To copy the current application tables from the local `dev.db` into a newly migrated, empty Neon database, first make a verified backup, then run:

```powershell
Copy-Item -LiteralPath .\dev.db -Destination .\backups\dev.db.before-neon.db
npm.cmd run db:import-sqlite
```

The import uses `DATABASE_URL_UNPOOLED` and refuses to write if the target application tables are not empty. It imports the active Prisma models only; archived monetary records and removed Google sign-in fields remain preserved in the SQLite backup. Local media files are still stored under `.data/objects`; configure persistent object storage before deploying uploads to a serverless host.

The existing-account admin recovery command supports SQLite and PostgreSQL. It only promotes an account that already exists and never creates an account or changes its password:

```powershell
npm.cmd run admin:bootstrap -- --email=the-existing-account@example.com
```
