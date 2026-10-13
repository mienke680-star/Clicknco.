import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { getRecurringServiceByContactId } from "@/lib/clickco/consulting";
import { writeAuditLog, requestMeta } from "@/lib/audit";

/** Marks today's review done and books the next one, `every` days out.
 * Ported from hub.js's consult-log action. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ contactId: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "consulting", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { contactId } = await params;

  const existing = await prisma.recurringService.findFirst({ where: { contactId, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + existing.every);
  await prisma.recurringService.update({ where: { contactId }, data: { nextReviewAt } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "recurringservice.review_logged",
    targetType: "RecurringService",
    targetId: existing.id,
    metadata: { nextReviewAt },
    ip,
    userAgent,
  });

  const full = await getRecurringServiceByContactId(ctx.company.id, contactId);
  return NextResponse.json({ service: full });
}
