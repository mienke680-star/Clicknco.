import "server-only";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/utils";
import { toPackageDTO, type PackageDTO } from "@/lib/clickco/packages";
import type { Quote, QuoteLineItem, Contact, Package, Prisma } from "@/generated/prisma/client";

const quoteInclude = {
  contact: true,
  package: true,
  lineItems: { orderBy: { sortOrder: "asc" as const } },
} as const;

type QuoteRow = Quote & { contact: Contact; package: Package; lineItems: QuoteLineItem[] };

export type QuoteLineItemDTO = Omit<QuoteLineItem, "amount"> & { amount: number };
export type QuoteDTO = Omit<Quote, "subtotal" | "vatAmount" | "total" | "monthlyTotal" | "depositAmount"> & {
  subtotal: number;
  vatAmount: number;
  total: number;
  monthlyTotal: number;
  depositAmount: number;
  contact: Contact;
  package: PackageDTO;
  lineItems: QuoteLineItemDTO[];
};

function toQuoteDTO(q: QuoteRow): QuoteDTO {
  return {
    ...q,
    subtotal: toNumber(q.subtotal),
    vatAmount: toNumber(q.vatAmount),
    total: toNumber(q.total),
    monthlyTotal: toNumber(q.monthlyTotal),
    depositAmount: toNumber(q.depositAmount),
    package: toPackageDTO(q.package),
    lineItems: q.lineItems.map((l) => ({ ...l, amount: toNumber(l.amount) })),
  };
}

export async function getQuotes(companyId: string): Promise<QuoteDTO[]> {
  const rows = await prisma.quote.findMany({
    where: { companyId },
    include: quoteInclude,
    orderBy: { number: "desc" },
  });
  return rows.map(toQuoteDTO);
}

export async function getQuoteById(companyId: string, id: string): Promise<QuoteDTO | null> {
  const row = await prisma.quote.findFirst({ where: { id, companyId }, include: quoteInclude });
  return row ? toQuoteDTO(row) : null;
}

/** Reads and increments BusinessSettings.nextQuoteNumber inside the given
 * transaction, formatted "QUO-<year>-0001" -- avoids duplicate numbers under
 * concurrent creates. */
export async function nextQuoteNumber(tx: Prisma.TransactionClient, companyId: string): Promise<string> {
  const settings = await tx.businessSettings.upsert({ where: { companyId }, update: {}, create: { companyId } });
  await tx.businessSettings.update({ where: { companyId }, data: { nextQuoteNumber: settings.nextQuoteNumber + 1 } });
  const year = new Date().getFullYear();
  return `QUO-${year}-${String(settings.nextQuoteNumber).padStart(4, "0")}`;
}
