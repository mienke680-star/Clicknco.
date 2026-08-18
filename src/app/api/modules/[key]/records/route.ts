import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { moduleRecordSchema } from "@/lib/validation/modules";
import { findMissingRequiredField, pickKnownFields } from "@/lib/modules/validate-record";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { runAutomationTrigger } from "@/lib/automation/engine";
import { notify } from "@/lib/notify";
import { singularize } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const ctx = await requireApiCompanyContext(req, { mutate: false });
  if (isApiError(ctx)) return ctx;
  const { key } = await params;
  if (!ctx.can(key, "view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const companyModule = await prisma.companyModule.findUnique({ where: { companyId_key: { companyId: ctx.company.id, key } } });
  if (!companyModule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const offset = Math.max(0, Number(sp.get("offset")) || 0);
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit")) || 100));

  const [records, total] = await Promise.all([
    prisma.moduleRecord.findMany({
      where: { moduleId: companyModule.id },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        relatedContact: { select: { id: true, firstName: true, lastName: true } },
        assignedUser: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.moduleRecord.count({ where: { moduleId: companyModule.id } }),
  ]);

  return NextResponse.json({ records, total, hasMore: offset + records.length < total });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const ctx = await requireApiCompanyContext(req, { module: key, action: "create" });
  if (isApiError(ctx)) return ctx;

  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_key: { companyId: ctx.company.id, key } },
    include: { fields: true },
  });
  if (!companyModule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = moduleRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const data = pickKnownFields(companyModule.fields, parsed.data.data);
  const missing = findMissingRequiredField(companyModule.fields, data);
  if (missing) return NextResponse.json({ error: `"${missing}" is required.` }, { status: 400 });

  const record = await prisma.moduleRecord.create({
    data: {
      companyId: ctx.company.id,
      moduleId: companyModule.id,
      data: data as Prisma.InputJsonValue,
      relatedContactId: parsed.data.relatedContactId || null,
      assignedUserId: parsed.data.assignedUserId || null,
      createdByUserId: ctx.user.id,
    },
    include: {
      relatedContact: { select: { id: true, firstName: true, lastName: true } },
      assignedUser: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "record.created",
    targetType: "ModuleRecord",
    targetId: record.id,
    metadata: { moduleKey: key },
    ip,
    userAgent,
  });
  await notify({
    companyId: ctx.company.id,
    type: "SYSTEM",
    title: `New ${singularize(companyModule.name)}: ${Object.values(data)[0] ?? "New record"}`.slice(0, 140),
    link: `/portal/modules/${key}`,
  });
  await runAutomationTrigger(ctx.company.id, "RECORD_CREATED", { moduleRecordId: record.id, moduleKey: key });

  return NextResponse.json({ record }, { status: 201 });
}
