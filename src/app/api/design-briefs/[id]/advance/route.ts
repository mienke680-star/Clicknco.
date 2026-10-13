import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { nextDesignStatus } from "@/lib/clickco/consulting-calc";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "consulting", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.designBrief.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = nextDesignStatus(existing.status);
  const brief = await prisma.designBrief.update({ where: { id }, data: { status }, include: { contact: true } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "designbrief.status_changed",
    targetType: "DesignBrief",
    targetId: id,
    metadata: { from: existing.status, to: status },
    ip,
    userAgent,
  });

  return NextResponse.json({ brief });
}
