import "dotenv/config";
import { defineConfig } from "prisma/config";
import { getConnectionString } from "@netlify/database";

// DATABASE_URL covers local dev and any manually-configured host. On Netlify,
// where the DB is auto-provisioned by @netlify/database, fall back to its
// connection string so `prisma migrate deploy`/seed work during the build.
const databaseUrl = process.env["DATABASE_URL"] || getConnectionString();

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
