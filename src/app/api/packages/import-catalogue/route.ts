import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { CATALOGUE_PACKAGES, CATALOGUE_ADDONS } from "@/lib/clickco/catalogue-seed";
import { writeAuditLog, requestMeta } from "@/lib/audit";

/** One-click import of the real Click & Co brochure catalogue. Idempotent --
 * upserts by (companyId, slug) for packages, so re-running it (e.g. after a
 * brochure update) never duplicates rows or touches a package's id (quotes
 * reference packageId directly, so existing quotes/invoices are unaffected
 * either way). Add-ons have no natural unique key in the schema, so they're
 * only created when none exist yet for this company -- re-importing after
 * the user has started editing/adding their own add-ons is a no-op. */
export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "packages", action: "create" });
  if (isApiError(ctx)) return ctx;

  let created = 0;
  let updated = 0;

  for (let i = 0; i < CATALOGUE_PACKAGES.length; i++) {
    const p = CATALOGUE_PACKAGES[i]!;
    const existed = await prisma.package.findUnique({ where: { companyId_slug: { companyId: ctx.company.id, slug: p.slug } } });
    await prisma.package.upsert({
      where: { companyId_slug: { companyId: ctx.company.id, slug: p.slug } },
      update: {
        category: p.category,
        name: p.name,
        strapline: p.strapline,
        price: p.price,
        billing: p.billing,
        customQuote: p.customQuote ?? false,
        deposit: p.deposit ?? null,
        instalment: p.instalment ?? null,
        instalmentMonths: p.instalmentMonths ?? null,
        onboarding: p.onboarding ?? null,
        minimumMonths: p.minimumMonths ?? null,
        featured: p.featured ?? false,
        features: p.features,
        active: true,
      },
      create: {
        companyId: ctx.company.id,
        slug: p.slug,
        category: p.category,
        name: p.name,
        strapline: p.strapline,
        price: p.price,
        billing: p.billing,
        customQuote: p.customQuote ?? false,
        deposit: p.deposit ?? null,
        instalment: p.instalment ?? null,
        instalmentMonths: p.instalmentMonths ?? null,
        onboarding: p.onboarding ?? null,
        minimumMonths: p.minimumMonths ?? null,
        featured: p.featured ?? false,
        features: p.features,
        sortOrder: i,
      },
    });
    if (existed) updated += 1;
    else created += 1;
  }

  const existingAddonCount = await prisma.addon.count({ where: { companyId: ctx.company.id } });
  let addonsCreated = 0;
  if (existingAddonCount === 0) {
    await prisma.addon.createMany({
      data: CATALOGUE_ADDONS.map((a, i) => ({
        companyId: ctx.company.id,
        name: a.name,
        price: a.price,
        billing: a.billing,
        customQuote: a.customQuote ?? false,
        sortOrder: i,
      })),
    });
    addonsCreated = CATALOGUE_ADDONS.length;
  }

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "package.catalogue_imported",
    targetType: "Package",
    targetId: ctx.company.id,
    metadata: { created, updated, addonsCreated },
    ip,
    userAgent,
  });

  return NextResponse.json({ created, updated, addonsCreated });
}
