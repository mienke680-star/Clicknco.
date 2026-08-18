import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { createModuleSchema } from "@/lib/validation/modules";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { slugify } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false });
  if (isApiError(ctx)) return ctx;

  const modules = await prisma.companyModule.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { fields: true, records: true } } },
  });

  return NextResponse.json({ modules });
}

async function uniqueModuleKey(companyId: string, base: string) {
  const root = slugify(base) || "module";
  let candidate = root;
  let n = 1;
  while (await prisma.companyModule.findUnique({ where: { companyId_key: { companyId, key: candidate } }, select: { id: true } })) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req);
  if (isApiError(ctx)) return ctx;
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "Only Super Admin can build modules" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createModuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const key = await uniqueModuleKey(ctx.company.id, data.name);
  const maxSort = await prisma.companyModule.aggregate({ where: { companyId: ctx.company.id }, _max: { sortOrder: true } });

  const companyModule = await prisma.companyModule.create({
    data: {
      companyId: ctx.company.id,
      key,
      name: data.name,
      icon: data.icon,
      group: data.group || null,
      kind: "CUSTOM",
      active: true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
    include: { _count: { select: { fields: true, records: true } } },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "module.created",
    targetType: "CompanyModule",
    targetId: companyModule.id,
    metadata: { key, name: data.name },
    ip,
    userAgent,
  });

  return NextResponse.json({ module: companyModule }, { status: 201 });
}
