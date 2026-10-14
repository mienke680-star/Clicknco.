import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { addonCreateSchema } from "@/lib/validation/clickco";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "packages", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = addonCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  if (data.packageId) {
    const pkg = await prisma.package.findFirst({ where: { id: data.packageId, companyId: ctx.company.id } });
    if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 400 });
  }

  const maxSort = await prisma.addon.aggregate({ where: { companyId: ctx.company.id }, _max: { sortOrder: true } });

  const addon = await prisma.addon.create({
    data: {
      companyId: ctx.company.id,
      name: data.name,
      price: data.price,
      billing: data.billing,
      customQuote: data.customQuote,
      packageId: data.packageId || null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "addon.created",
    targetType: "Addon",
    targetId: addon.id,
    metadata: { name: addon.name },
    ip,
    userAgent,
  });

  return NextResponse.json({ addon }, { status: 201 });
}
