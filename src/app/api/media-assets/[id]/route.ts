import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "documents", action: "delete" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.mediaAsset.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.mediaAsset.delete({ where: { id } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "document.deleted", targetType: "MediaAsset", targetId: id, metadata: { fileName: existing.fileName }, ip, userAgent });

  return NextResponse.json({ ok: true });
}
