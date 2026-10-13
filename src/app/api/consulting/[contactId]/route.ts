import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { recurringServiceHealthSchema } from "@/lib/validation/clickco";
import { getRecurringServiceByContactId } from "@/lib/clickco/consulting";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ contactId: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "consulting", action: "view" });
  if (isApiError(ctx)) return ctx;
  const { contactId } = await params;

  const service = await getRecurringServiceByContactId(ctx.company.id, contactId);
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ service });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ contactId: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "consulting", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { contactId } = await params;

  const existing = await prisma.recurringService.findFirst({ where: { contactId, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = recurringServiceHealthSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.recurringService.update({ where: { contactId }, data: { health: parsed.data.health } });

  if (parsed.data.health !== existing.health) {
    const { ip, userAgent } = requestMeta(req);
    await writeAuditLog({
      companyId: ctx.company.id,
      actorUserId: ctx.user.id,
      action: "recurringservice.health_changed",
      targetType: "RecurringService",
      targetId: existing.id,
      metadata: { from: existing.health, to: parsed.data.health },
      ip,
      userAgent,
    });
  }

  const full = await getRecurringServiceByContactId(ctx.company.id, contactId);
  return NextResponse.json({ service: full });
}
