import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { createTemplateSchema } from "@/lib/validation/emails";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "emails", action: "view" });
  if (isApiError(ctx)) return ctx;

  const templates = await prisma.emailTemplate.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "emails", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const template = await prisma.emailTemplate.create({
    data: {
      companyId: ctx.company.id,
      name: parsed.data.name,
      subject: parsed.data.subject,
      body: parsed.data.body,
      category: parsed.data.category || null,
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "email_template.created", targetType: "EmailTemplate", targetId: template.id, ip, userAgent });

  return NextResponse.json({ template }, { status: 201 });
}
