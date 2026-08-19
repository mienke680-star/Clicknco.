import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { moduleRecordSchema } from "@/lib/validation/modules";
import { findMissingRequiredField, pickKnownFields } from "@/lib/modules/validate-record";
import { assertContactInCompany, assertUserInCompany } from "@/lib/tenant-refs";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";

const RECORD_INCLUDE = {
  relatedContact: { select: { id: true, firstName: true, lastName: true } },
  assignedUser: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string; recordId: string }> }) {
  const ctx = await requireApiCompanyContext(req, { mutate: false });
  if (isApiError(ctx)) return ctx;
  const { key, recordId } = await params;
  if (!ctx.can(key, "view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const record = await prisma.moduleRecord.findFirst({
    where: { id: recordId, companyId: ctx.company.id, module: { key } },
    include: RECORD_INCLUDE,
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ record });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string; recordId: string }> }) {
  const { key, recordId } = await params;
  const ctx = await requireApiCompanyContext(req, { module: key, action: "edit" });
  if (isApiError(ctx)) return ctx;

  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_key: { companyId: ctx.company.id, key } },
    include: { fields: true },
  });
  if (!companyModule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.moduleRecord.findFirst({ where: { id: recordId, moduleId: companyModule.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = moduleRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const data = pickKnownFields(companyModule.fields, parsed.data.data);
  const missing = findMissingRequiredField(companyModule.fields, data);
  if (missing) return NextResponse.json({ error: `"${missing}" is required.` }, { status: 400 });

  const refError =
    (await assertContactInCompany(ctx.company.id, parsed.data.relatedContactId)) ??
    (await assertUserInCompany(ctx.company.id, parsed.data.assignedUserId));
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  const record = await prisma.moduleRecord.update({
    where: { id: recordId },
    data: {
      data: data as Prisma.InputJsonValue,
      relatedContactId: parsed.data.relatedContactId || null,
      assignedUserId: parsed.data.assignedUserId || null,
    },
    include: RECORD_INCLUDE,
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "record.updated",
    targetType: "ModuleRecord",
    targetId: record.id,
    metadata: { moduleKey: key },
    ip,
    userAgent,
  });

  return NextResponse.json({ record });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ key: string; recordId: string }> }) {
  const { key, recordId } = await params;
  const ctx = await requireApiCompanyContext(req, { module: key, action: "delete" });
  if (isApiError(ctx)) return ctx;

  const existing = await prisma.moduleRecord.findFirst({ where: { id: recordId, companyId: ctx.company.id, module: { key } } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.moduleRecord.delete({ where: { id: recordId } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "record.deleted",
    targetType: "ModuleRecord",
    targetId: recordId,
    metadata: { moduleKey: key },
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
