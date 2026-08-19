import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { updateDocumentTemplateSchema } from "@/lib/validation/documents";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "documents", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.documentTemplate.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateDocumentTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.content !== undefined) data.content = parsed.data.content;

  const template = await prisma.documentTemplate.update({ where: { id }, data });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "document_template.updated", targetType: "DocumentTemplate", targetId: id, ip, userAgent });

  return NextResponse.json({ template });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "documents", action: "delete" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.documentTemplate.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.documentTemplate.delete({ where: { id } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "document_template.deleted", targetType: "DocumentTemplate", targetId: id, metadata: { name: existing.name }, ip, userAgent });

  return NextResponse.json({ ok: true });
}
