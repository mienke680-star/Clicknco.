import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { paymentCreateSchema } from "@/lib/validation/clickco";
import { getInvoiceById, invoiceBalance } from "@/lib/clickco/invoices";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "invoices", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const invoice = await getInvoiceById(ctx.company.id, id);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = paymentCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const { amount, paidAt, method, reference } = parsed.data;

  const balance = invoiceBalance(invoice);
  if (amount > balance + 0.001) {
    return NextResponse.json({ error: `That is more than the ${balance.toFixed(2)} still owing.` }, { status: 400 });
  }

  await prisma.payment.create({
    data: {
      companyId: ctx.company.id,
      invoiceId: id,
      amount,
      paidAt: new Date(paidAt),
      method,
      reference: reference || null,
      createdByUserId: ctx.user.id,
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "payment.recorded", targetType: "Invoice", targetId: id, metadata: { amount, method }, ip, userAgent });

  const full = await getInvoiceById(ctx.company.id, id);
  return NextResponse.json({ invoice: full });
}
