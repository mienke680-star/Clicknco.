import "server-only";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/utils";
import type { Invoice, Payment, Contact, Prisma } from "@/generated/prisma/client";
import type { InvoiceDTO } from "@/lib/clickco/invoice-calc";

export type { PaymentDTO, InvoiceDTO, InvoiceStatus } from "@/lib/clickco/invoice-calc";
export { invoicePaid, invoiceBalance, invoiceStatus } from "@/lib/clickco/invoice-calc";

const invoiceInclude = {
  contact: true,
  payments: { orderBy: { paidAt: "asc" as const } },
} as const;

type InvoiceRow = Invoice & { contact: Contact; payments: Payment[] };

function toInvoiceDTO(i: InvoiceRow): InvoiceDTO {
  return {
    ...i,
    amount: toNumber(i.amount),
    payments: i.payments.map((p) => ({ ...p, amount: toNumber(p.amount) })),
  };
}

export async function getInvoices(companyId: string): Promise<InvoiceDTO[]> {
  const rows = await prisma.invoice.findMany({ where: { companyId }, include: invoiceInclude, orderBy: { number: "desc" } });
  return rows.map(toInvoiceDTO);
}

export async function getInvoiceById(companyId: string, id: string): Promise<InvoiceDTO | null> {
  const row = await prisma.invoice.findFirst({ where: { id, companyId }, include: invoiceInclude });
  return row ? toInvoiceDTO(row) : null;
}

/** Reads and increments BusinessSettings.nextInvoiceNumber inside the given
 * transaction, formatted "INV-<year>-0001" -- avoids duplicate numbers under
 * concurrent creates. */
export async function nextInvoiceNumber(tx: Prisma.TransactionClient, companyId: string): Promise<string> {
  const settings = await tx.businessSettings.upsert({ where: { companyId }, update: {}, create: { companyId } });
  await tx.businessSettings.update({ where: { companyId }, data: { nextInvoiceNumber: settings.nextInvoiceNumber + 1 } });
  const year = new Date().getFullYear();
  return `INV-${year}-${String(settings.nextInvoiceNumber).padStart(4, "0")}`;
}
