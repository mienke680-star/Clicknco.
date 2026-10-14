import "dotenv/config";
import { prisma } from "../src/lib/db";
import { fullAccess, viewOnly, noAccess, type StaffPermissions } from "../src/lib/permissions";

/**
 * provisionDefaultStaffRoles() only runs when a company is first created, so
 * the Operations Hub's 7 new module keys (quotes/invoices/projects/consulting/
 * calendar/packages/business_settings) are silently missing from every
 * already-existing company's StaffRole rows. Run this once after the Hub's
 * schema migration lands:
 *
 *   npx tsx scripts/backfill-hub-permissions.ts
 */

const HUB_KEYS = ["quotes", "invoices", "projects", "packages", "consulting", "calendar", "business_settings"] as const;

const SALES_DEFAULTS: Partial<Record<(typeof HUB_KEYS)[number], Partial<Record<string, boolean>>>> = {
  quotes: fullAccess(),
  invoices: fullAccess(),
  projects: fullAccess(),
  consulting: fullAccess(),
  calendar: fullAccess(),
  packages: viewOnly(),
  business_settings: viewOnly(),
};

const VIEWER_DEFAULTS: Partial<Record<(typeof HUB_KEYS)[number], Partial<Record<string, boolean>>>> = Object.fromEntries(
  HUB_KEYS.map((k) => [k, viewOnly()]),
);

/** A role "looks like Sales" if it has create access on contacts -- the one
 * permission provisionDefaultStaffRoles() sets uniquely for that role. Any
 * other/custom role falls back to view-only, the safe-by-default direction. */
function looksLikeSales(permissions: StaffPermissions) {
  return Boolean(permissions?.contacts?.create);
}

async function main() {
  const roles = await prisma.staffRole.findMany();
  let updated = 0;

  for (const role of roles) {
    const permissions = (role.permissions as StaffPermissions | null) ?? {};
    const missingKeys = HUB_KEYS.filter((k) => !(k in permissions));
    if (missingKeys.length === 0) continue;

    const defaults = looksLikeSales(permissions) ? SALES_DEFAULTS : VIEWER_DEFAULTS;
    const merged: StaffPermissions = { ...permissions };
    for (const key of missingKeys) {
      merged[key] = (defaults[key] ?? noAccess()) as StaffPermissions[string];
    }

    await prisma.staffRole.update({ where: { id: role.id }, data: { permissions: merged as never } });
    updated++;
  }

  console.log(`Backfilled Operations Hub permission keys on ${updated} of ${roles.length} staff roles.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
