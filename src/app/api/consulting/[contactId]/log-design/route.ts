import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { getRecurringServiceByContactId } from "@/lib/clickco/consulting";
import { writeAuditLog, requestMeta } from "@/lib/audit";

/** Logs one delivered design against the retainer's monthly quota. Ported
 * from hub.js's consult-design action -- a no-op once the quota is used up. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ contactId: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "consulting", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { contactId } = await params;

  const existing = await prisma.recurringService.findFirst({ where: { contactId, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.usedDesigns < existing.designQuota) {
    await prisma.recurringService.update({ where: { contactId }, data: { usedDesigns: existing.usedDesigns + 1 } });

    const { ip, userAgent } = requestMeta(req);
    await writeAuditLog({
      companyId: ctx.company.id,
      actorUserId: ctx.user.id,
      action: "recurringservice.design_logged",
      targetType: "RecurringService",
      targetId: existing.id,
      metadata: { usedDesigns: existing.usedDesigns + 1, designQuota: existing.designQuota },
      ip,
      userAgent,
    });
  }

  const full = await getRecurringServiceByContactId(ctx.company.id, contactId);
  return NextResponse.json({ service: full });
}
