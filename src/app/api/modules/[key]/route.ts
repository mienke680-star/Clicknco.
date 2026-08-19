import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { updateModuleSchema } from "@/lib/validation/modules";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const ctx = await requireApiCompanyContext(req, { mutate: false });
  if (isApiError(ctx)) return ctx;
  const { key } = await params;

  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_key: { companyId: ctx.company.id, key } },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });
  if (!companyModule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!ctx.can(key, "view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ module: companyModule });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const ctx = await requireApiCompanyContext(req);
  if (isApiError(ctx)) return ctx;
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "Only Super Admin can build modules" }, { status: 403 });
  const { key } = await params;

  const existing = await prisma.companyModule.findUnique({ where: { companyId_key: { companyId: ctx.company.id, key } } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateModuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const companyModule = await prisma.companyModule.update({
    where: { id: existing.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.icon !== undefined ? { icon: data.icon } : {}),
      ...(data.group !== undefined ? { group: data.group || null } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
    include: { _count: { select: { fields: true, records: true } } },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "module.updated",
    targetType: "CompanyModule",
    targetId: companyModule.id,
    ip,
    userAgent,
  });

  return NextResponse.json({ module: companyModule });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const ctx = await requireApiCompanyContext(req);
  if (isApiError(ctx)) return ctx;
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "Only Super Admin can build modules" }, { status: 403 });
  const { key } = await params;

  const existing = await prisma.companyModule.findUnique({ where: { companyId_key: { companyId: ctx.company.id, key } } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.kind === "BUILTIN") {
    return NextResponse.json({ error: "Built-in modules can't be deleted — turn them off instead." }, { status: 400 });
  }

  await prisma.companyModule.delete({ where: { id: existing.id } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "module.deleted",
    targetType: "CompanyModule",
    targetId: existing.id,
    metadata: { key },
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
