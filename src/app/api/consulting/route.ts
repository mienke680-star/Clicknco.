import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { recurringServiceCreateSchema } from "@/lib/validation/clickco";
import { assertContactInCompany } from "@/lib/tenant-refs";
import { getRecurringServices } from "@/lib/clickco/consulting";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "consulting", action: "view" });
  if (isApiError(ctx)) return ctx;

  const services = await getRecurringServices(ctx.company.id);
  return NextResponse.json({ services });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "consulting", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = recurringServiceCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const { contactId, platforms, cadenceLabel, every, designQuota, focus } = parsed.data;

  const refError = await assertContactInCompany(ctx.company.id, contactId);
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  const existing = await prisma.recurringService.findUnique({ where: { contactId } });
  if (existing) return NextResponse.json({ error: "This client already has a consulting retainer." }, { status: 400 });

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + every);

  const service = await prisma.recurringService.create({
    data: { companyId: ctx.company.id, contactId, platforms, cadenceLabel, every, designQuota, focus: focus || null, nextReviewAt },
    include: { contact: true },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "recurringservice.created", targetType: "RecurringService", targetId: service.id, ip, userAgent });

  return NextResponse.json({ service });
}
