import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getConnectionString } from "@netlify/database";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** DATABASE_URL covers local dev and any manually-configured host. On Netlify,
 * where the DB is auto-provisioned by @netlify/database, no such env var is
 * set — fall back to its connection string, which resolves to the right
 * branch (production vs. deploy preview) for the current deploy context. */
function resolveConnectionString(): string {
  return process.env.DATABASE_URL || getConnectionString();
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: resolveConnectionString() });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
