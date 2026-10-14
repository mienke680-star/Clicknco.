import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { invoiceCreateSchema } from "@/lib/validation/clickco";
import { assertContactInCompany } from "@/lib/tenant-refs";
import { getInvoices, getInvoiceById, nextInvoiceNumber } from "@/lib/clickco/invoices";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "invoices", action: "view" });
  if (isApiError(ctx)) return ctx;

  const invoices = await getInvoices(ctx.company.id);
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "invoices", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = invoiceCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const { contactId, description, amount, dueDate } = parsed.data;

  const refError = await assertContactInCompany(ctx.company.id, contactId);
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  const invoice = await prisma.$transaction(async (tx) => {
    const number = await nextInvoiceNumber(tx, ctx.company.id);
    return tx.invoice.create({
      data: {
        companyId: ctx.company.id,
        contactId,
        number,
        description,
        amount,
        dueDate: new Date(dueDate),
        createdByUserId: ctx.user.id,
      },
    });
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "invoice.created", targetType: "Invoice", targetId: invoice.id, ip, userAgent });

  const full = await getInvoiceById(ctx.company.id, invoice.id);
  return NextResponse.json({ invoice: full });
}
