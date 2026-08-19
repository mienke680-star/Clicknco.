import "dotenv/config";
import { defineConfig } from "prisma/config";
import { getConnectionString } from "@netlify/database";

// DATABASE_URL covers local dev and any manually-configured host. On Netlify,
// where the DB is auto-provisioned by @netlify/database, fall back to its
// connection string so `prisma migrate deploy`/seed work during the build.
// getConnectionString() throws when no Netlify DB binding is present (e.g. a
// deploy-preview build, or `prisma generate` running with no DB access at
// all) -- this file is loaded by every Prisma CLI invocation including ones
// that don't touch the database, so that throw can't be allowed to propagate.
function resolveDatabaseUrl(): string | undefined {
  if (process.env["DATABASE_URL"]) return process.env["DATABASE_URL"];
  try {
    return getConnectionString();
  } catch {
    return undefined;
  }
}
const databaseUrl = resolveDatabaseUrl();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
