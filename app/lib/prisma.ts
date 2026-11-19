import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL must be set.");

const pool = globalForPrisma.pgPool ?? new Pool({ connectionString: databaseUrl });
if (!globalForPrisma.pgPool) {
  globalForPrisma.pgPool = pool;
  if (process.env.VERCEL === "1") attachDatabasePool(pool);
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg(pool) });
globalForPrisma.prisma = prisma;