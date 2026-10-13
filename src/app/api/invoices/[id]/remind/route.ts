import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { getInvoiceById } from "@/lib/clickco/invoices";
import { writeAuditLog, requestMeta } from "@/lib/audit";

/** Marks an invoice as reminded. The reminder message itself is composed and
 * sent client-side (WhatsApp/email link, or copy) via ComposeDialog -- this
 * route just records that it happened, matching hub.js's onSent callback. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "invoices", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.invoice.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.invoice.update({ where: { id }, data: { remindedAt: new Date() } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "invoice.reminder_sent", targetType: "Invoice", targetId: id, ip, userAgent });

  const full = await getInvoiceById(ctx.company.id, id);
  return NextResponse.json({ invoice: full });
}
