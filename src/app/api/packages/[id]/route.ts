import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { packageUpdateSchema } from "@/lib/validation/clickco";
import { uniquePackageSlug } from "@/lib/clickco/packages";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "packages", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.package.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = packageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const pkg = await prisma.package.update({
    where: { id },
    data: {
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.strapline !== undefined ? { strapline: data.strapline || "" } : {}),
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.billing !== undefined ? { billing: data.billing } : {}),
      ...(data.customQuote !== undefined ? { customQuote: data.customQuote } : {}),
      ...(data.deposit !== undefined ? { deposit: data.deposit } : {}),
      ...(data.instalment !== undefined ? { instalment: data.instalment } : {}),
      ...(data.instalmentMonths !== undefined ? { instalmentMonths: data.instalmentMonths } : {}),
      ...(data.onboarding !== undefined ? { onboarding: data.onboarding } : {}),
      ...(data.minimumMonths !== undefined ? { minimumMonths: data.minimumMonths } : {}),
      ...(data.featured !== undefined ? { featured: data.featured } : {}),
      ...(data.features !== undefined ? { features: data.features } : {}),
      ...(data.turnaroundLabel !== undefined ? { turnaroundLabel: data.turnaroundLabel || null } : {}),
      ...(data.internalNotes !== undefined ? { internalNotes: data.internalNotes || null } : {}),
      ...(data.defaultTasks !== undefined ? { defaultTasks: data.defaultTasks } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: data.active === false ? "package.archived" : data.active === true && !existing.active ? "package.restored" : "package.updated",
    targetType: "Package",
    targetId: pkg.id,
    metadata: { name: pkg.name },
    ip,
    userAgent,
  });

  return NextResponse.json({ package: pkg });
}
