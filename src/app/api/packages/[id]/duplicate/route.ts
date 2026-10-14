import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { uniquePackageSlug } from "@/lib/clickco/packages";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "packages", action: "create" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.package.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const maxSort = await prisma.package.aggregate({ where: { companyId: ctx.company.id }, _max: { sortOrder: true } });
  const name = `${existing.name} (copy)`;
  const slug = await uniquePackageSlug(ctx.company.id, name);

  const pkg = await prisma.package.create({
    data: {
      companyId: ctx.company.id,
      slug,
      category: existing.category,
      name,
      strapline: existing.strapline,
      price: existing.price,
      billing: existing.billing,
      customQuote: existing.customQuote,
      deposit: existing.deposit,
      instalment: existing.instalment,
      instalmentMonths: existing.instalmentMonths,
      onboarding: existing.onboarding,
      minimumMonths: existing.minimumMonths,
      featured: false,
      features: existing.features,
      turnaroundLabel: existing.turnaroundLabel,
      internalNotes: existing.internalNotes,
      defaultTasks: existing.defaultTasks,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "package.created",
    targetType: "Package",
    targetId: pkg.id,
    metadata: { name: pkg.name, duplicatedFrom: existing.id },
    ip,
    userAgent,
  });

  return NextResponse.json({ package: pkg }, { status: 201 });
}
