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
  const client = new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

let lazyClient: PrismaClient | undefined;

/** Resolving a real connection can throw when neither DATABASE_URL nor the
 * Netlify DB binding is available -- e.g. while Next.js statically imports
 * every route module during `next build`, well before any request actually
 * needs a database. Defer client construction to first real use instead of
 * crashing the build just for importing this module. */
function getPrisma(): PrismaClient {
  return (lazyClient ??= globalForPrisma.prisma ?? createPrismaClient());
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    const value = Reflect.get(client as object, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
