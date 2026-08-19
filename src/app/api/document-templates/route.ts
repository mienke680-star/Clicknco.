import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { createDocumentTemplateSchema } from "@/lib/validation/documents";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "documents", action: "view" });
  if (isApiError(ctx)) return ctx;

  const templates = await prisma.documentTemplate.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "documents", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = createDocumentTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const template = await prisma.documentTemplate.create({
    data: { companyId: ctx.company.id, name: parsed.data.name, content: parsed.data.content },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "document_template.created", targetType: "DocumentTemplate", targetId: template.id, ip, userAgent });

  return NextResponse.json({ template }, { status: 201 });
}
