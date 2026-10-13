import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { quoteStatusSchema } from "@/lib/validation/clickco";
import { getQuoteById } from "@/lib/clickco/quotes";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import type { QuoteStatus } from "@/generated/prisma/client";

const ALLOWED_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["VIEWED", "DECLINED"],
  VIEWED: ["DECLINED"],
  ACCEPTED: [],
  DECLINED: ["DRAFT"],
};

const AUDIT_ACTION: Record<string, string> = {
  SENT: "quote.sent",
  VIEWED: "quote.viewed",
  DECLINED: "quote.declined",
  DRAFT: "quote.reopened",
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "quotes", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.quote.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = quoteStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (!ALLOWED_TRANSITIONS[existing.status].includes(parsed.data.status)) {
    return NextResponse.json({ error: `Can't move a ${existing.status.toLowerCase()} quote to ${parsed.data.status.toLowerCase()}.` }, { status: 400 });
  }

  await prisma.quote.update({ where: { id }, data: { status: parsed.data.status } });

  if (parsed.data.status === "SENT") {
    const contact = await prisma.contact.findUnique({ where: { id: existing.contactId } });
    if (contact?.status === "Lead") {
      await prisma.contact.update({ where: { id: existing.contactId }, data: { status: "Quoted" } });
    }
  }

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: AUDIT_ACTION[parsed.data.status] ?? "quote.updated",
    targetType: "Quote",
    targetId: id,
    ip,
    userAgent,
  });

  const full = await getQuoteById(ctx.company.id, id);
  return NextResponse.json({ quote: full });
}
