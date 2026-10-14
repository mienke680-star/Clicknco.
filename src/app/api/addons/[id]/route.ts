import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { addonUpdateSchema } from "@/lib/validation/clickco";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "packages", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.addon.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = addonUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  if (data.packageId) {
    const pkg = await prisma.package.findFirst({ where: { id: data.packageId, companyId: ctx.company.id } });
    if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 400 });
  }

  const addon = await prisma.addon.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.billing !== undefined ? { billing: data.billing } : {}),
      ...(data.customQuote !== undefined ? { customQuote: data.customQuote } : {}),
      ...(data.packageId !== undefined ? { packageId: data.packageId || null } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: data.active === false ? "addon.archived" : "addon.updated",
    targetType: "Addon",
    targetId: addon.id,
    metadata: { name: addon.name },
    ip,
    userAgent,
  });

  return NextResponse.json({ addon });
}
