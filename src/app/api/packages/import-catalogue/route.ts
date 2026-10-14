import { NextRequest, NextResponse } from "next/server";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { seedCatalogueForCompany } from "@/lib/clickco/catalogue-seed";
import { writeAuditLog, requestMeta } from "@/lib/audit";

/** One-click (re-)import of the real Click & Co brochure catalogue. Every
 * new company already gets this automatically on creation (see
 * provisionNewCompany) -- this route exists so it can also be re-run later,
 * e.g. after a brochure/price update, without touching Prisma Studio. */
export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "packages", action: "create" });
  if (isApiError(ctx)) return ctx;

  const result = await seedCatalogueForCompany(ctx.company.id);

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "package.catalogue_imported",
    targetType: "Package",
    targetId: ctx.company.id,
    metadata: result,
    ip,
    userAgent,
  });

  return NextResponse.json(result);
}
