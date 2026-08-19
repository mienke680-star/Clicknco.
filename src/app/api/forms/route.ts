import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { createFormSchema } from "@/lib/validation/forms";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "forms", action: "view" });
  if (isApiError(ctx)) return ctx;

  const forms = await prisma.form.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });

  return NextResponse.json({ forms });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "forms", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = createFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  if (parsed.data.targetModuleKey && parsed.data.targetModuleKey !== "contacts") {
    const targetModule = await prisma.companyModule.findUnique({
      where: { companyId_key: { companyId: ctx.company.id, key: parsed.data.targetModuleKey } },
    });
    if (!targetModule) return NextResponse.json({ error: "Target module not found" }, { status: 400 });
  }

  const form = await prisma.form.create({
    data: {
      companyId: ctx.company.id,
      name: parsed.data.name,
      fields: parsed.data.fields,
      targetModuleKey: parsed.data.targetModuleKey || null,
      successAction: parsed.data.successAction,
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "form.created", targetType: "Form", targetId: form.id, ip, userAgent });

  return NextResponse.json({ form }, { status: 201 });
}
