import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { getPackages, getAddons, uniquePackageSlug } from "@/lib/clickco/packages";
import { packageCreateSchema } from "@/lib/validation/clickco";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "packages", action: "view" });
  if (isApiError(ctx)) return ctx;

  const includeArchived = req.nextUrl.searchParams.get("includeArchived") === "1";
  const [packages, addons] = await Promise.all([
    getPackages(ctx.company.id, includeArchived),
    getAddons(ctx.company.id, includeArchived),
  ]);
  return NextResponse.json({ packages, addons });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "packages", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = packageCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const maxSort = await prisma.package.aggregate({ where: { companyId: ctx.company.id }, _max: { sortOrder: true } });
  const slug = await uniquePackageSlug(ctx.company.id, data.name);

  const pkg = await prisma.package.create({
    data: {
      companyId: ctx.company.id,
      slug,
      category: data.category,
      name: data.name,
      strapline: data.strapline || "",
      price: data.price,
      billing: data.billing,
      customQuote: data.customQuote,
      deposit: data.deposit ?? null,
      instalment: data.instalment ?? null,
      instalmentMonths: data.instalmentMonths ?? null,
      onboarding: data.onboarding ?? null,
      minimumMonths: data.minimumMonths ?? null,
      featured: data.featured,
      features: data.features,
      turnaroundLabel: data.turnaroundLabel || null,
      internalNotes: data.internalNotes || null,
      defaultTasks: data.defaultTasks,
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
    metadata: { name: pkg.name },
    ip,
    userAgent,
  });

  return NextResponse.json({ package: pkg }, { status: 201 });
}
