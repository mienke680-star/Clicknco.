import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { createFieldSchema } from "@/lib/validation/modules";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";

const CHOICE_TYPES = new Set(["DROPDOWN", "MULTISELECT", "STATUS"]);

function fieldOptions(type: string, choices?: string[], targetModuleKey?: string): Prisma.InputJsonValue | undefined {
  if (CHOICE_TYPES.has(type)) return { choices: choices ?? [] };
  if (type === "RELATIONSHIP") return { targetModuleKey };
  return undefined;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const ctx = await requireApiCompanyContext(req);
  if (isApiError(ctx)) return ctx;
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "Only Super Admin can build modules" }, { status: 403 });
  const { key } = await params;

  const companyModule = await prisma.companyModule.findUnique({ where: { companyId_key: { companyId: ctx.company.id, key } } });
  if (!companyModule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (companyModule.kind !== "CUSTOM") {
    return NextResponse.json({ error: "Built-in modules have fixed fields." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createFieldSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  if (data.type === "RELATIONSHIP" && data.targetModuleKey) {
    const target = await prisma.companyModule.findUnique({ where: { companyId_key: { companyId: ctx.company.id, key: data.targetModuleKey } } });
    if (!target) return NextResponse.json({ error: "That target module doesn't exist." }, { status: 400 });
  }

  const root = data.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") || "field";
  let fieldKey = root;
  let n = 1;
  while (await prisma.moduleField.findUnique({ where: { moduleId_key: { moduleId: companyModule.id, key: fieldKey } }, select: { id: true } })) {
    n += 1;
    fieldKey = `${root}_${n}`;
  }

  const maxSort = await prisma.moduleField.aggregate({ where: { moduleId: companyModule.id }, _max: { sortOrder: true } });

  const field = await prisma.moduleField.create({
    data: {
      moduleId: companyModule.id,
      key: fieldKey,
      label: data.label,
      type: data.type,
      required: data.required,
      showInList: data.showInList,
      options: fieldOptions(data.type, data.choices, data.targetModuleKey),
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "module.field_added",
    targetType: "ModuleField",
    targetId: field.id,
    metadata: { moduleKey: key, fieldKey },
    ip,
    userAgent,
  });

  return NextResponse.json({ field }, { status: 201 });
}
