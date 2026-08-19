import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { updateFormSchema } from "@/lib/validation/forms";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "forms", action: "view" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const form = await prisma.form.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ form });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "forms", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.form.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  if (parsed.data.targetModuleKey && parsed.data.targetModuleKey !== "contacts") {
    const targetModule = await prisma.companyModule.findUnique({
      where: { companyId_key: { companyId: ctx.company.id, key: parsed.data.targetModuleKey } },
    });
    if (!targetModule) return NextResponse.json({ error: "Target module not found" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.fields !== undefined) data.fields = parsed.data.fields;
  if (parsed.data.targetModuleKey !== undefined) data.targetModuleKey = parsed.data.targetModuleKey || null;
  if (parsed.data.successAction !== undefined) data.successAction = parsed.data.successAction;

  const form = await prisma.form.update({ where: { id }, data });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "form.updated", targetType: "Form", targetId: id, ip, userAgent });

  return NextResponse.json({ form });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "forms", action: "delete" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.form.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.form.delete({ where: { id } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "form.deleted", targetType: "Form", targetId: id, metadata: { name: existing.name }, ip, userAgent });

  return NextResponse.json({ ok: true });
}
