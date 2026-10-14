import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { designBriefCreateSchema } from "@/lib/validation/clickco";
import { assertContactInCompany } from "@/lib/tenant-refs";
import { getDesignBriefs } from "@/lib/clickco/consulting";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "consulting", action: "view" });
  if (isApiError(ctx)) return ctx;

  const briefs = await getDesignBriefs(ctx.company.id);
  return NextResponse.json({ briefs });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "consulting", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = designBriefCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const { contactId, title, detail } = parsed.data;

  const refError = await assertContactInCompany(ctx.company.id, contactId);
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  const brief = await prisma.designBrief.create({
    data: { companyId: ctx.company.id, contactId, title, detail: detail || "No due date" },
    include: { contact: true },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "designbrief.created", targetType: "DesignBrief", targetId: brief.id, ip, userAgent });

  return NextResponse.json({ brief });
}
