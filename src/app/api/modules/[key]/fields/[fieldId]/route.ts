import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { updateFieldSchema } from "@/lib/validation/modules";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";

const CHOICE_TYPES = new Set(["DROPDOWN", "MULTISELECT", "STATUS"]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string; fieldId: string }> }) {
  const ctx = await requireApiCompanyContext(req);
  if (isApiError(ctx)) return ctx;
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "Only Super Admin can build modules" }, { status: 403 });
  const { key, fieldId } = await params;

  const companyModule = await prisma.companyModule.findUnique({ where: { companyId_key: { companyId: ctx.company.id, key } } });
  if (!companyModule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.moduleField.findFirst({ where: { id: fieldId, moduleId: companyModule.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateFieldSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  let options: Prisma.InputJsonValue | undefined;
  if (CHOICE_TYPES.has(existing.type) && data.choices) {
    options = { choices: data.choices };
  } else if (existing.type === "RELATIONSHIP" && data.targetModuleKey) {
    options = { targetModuleKey: data.targetModuleKey };
  }

  const field = await prisma.moduleField.update({
    where: { id: fieldId },
    data: {
      ...(data.label !== undefined ? { label: data.label } : {}),
      ...(data.required !== undefined ? { required: data.required } : {}),
      ...(data.showInList !== undefined ? { showInList: data.showInList } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(options !== undefined ? { options } : {}),
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "module.field_updated",
    targetType: "ModuleField",
    targetId: field.id,
    ip,
    userAgent,
  });

  return NextResponse.json({ field });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ key: string; fieldId: string }> }) {
  const ctx = await requireApiCompanyContext(req);
  if (isApiError(ctx)) return ctx;
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "Only Super Admin can build modules" }, { status: 403 });
  const { key, fieldId } = await params;

  const companyModule = await prisma.companyModule.findUnique({ where: { companyId_key: { companyId: ctx.company.id, key } } });
  if (!companyModule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.moduleField.findFirst({ where: { id: fieldId, moduleId: companyModule.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.moduleField.delete({ where: { id: fieldId } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "module.field_deleted",
    targetType: "ModuleField",
    targetId: fieldId,
    metadata: { moduleKey: key, fieldKey: existing.key },
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
