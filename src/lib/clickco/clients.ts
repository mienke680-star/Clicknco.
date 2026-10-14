import "server-only";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/utils";
import type { ProjectStage, QuoteStatus, Prisma } from "@/generated/prisma/client";
import type { ClientDTO } from "@/lib/clickco/client-calc";

export type { ClientDTO, ClientProjectRef, ClientQuoteRef, ClientInvoiceRef } from "@/lib/clickco/client-calc";
export { clientNeedsAttention, currentWorkFor, clientOwed, clientPaidToDate } from "@/lib/clickco/client-calc";

const clientSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  company: true,
  status: true,
  clientNote: true,
  createdAt: true,
  projects: { select: { id: true, name: true, stage: true }, orderBy: { dueDate: "asc" as const } },
  quotes: { select: { id: true, number: true, status: true, total: true }, orderBy: { number: "desc" as const } },
  invoices: {
    select: { id: true, number: true, amount: true, dueDate: true, payments: { select: { amount: true } } },
    orderBy: { number: "desc" as const },
  },
} as const;

type ClientRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string | null;
  clientNote: string | null;
  createdAt: Date;
  projects: { id: string; name: string; stage: ProjectStage }[];
  quotes: { id: string; number: string; status: QuoteStatus; total: Prisma.Decimal }[];
  invoices: { id: string; number: string; amount: Prisma.Decimal; dueDate: Date; payments: { amount: Prisma.Decimal }[] }[];
};

function toClientDTO(c: ClientRow): ClientDTO {
  return {
    ...c,
    quotes: c.quotes.map((q) => ({ ...q, total: toNumber(q.total) })),
    invoices: c.invoices.map((i) => ({ ...i, amount: toNumber(i.amount), payments: i.payments.map((p) => ({ amount: toNumber(p.amount) })) })),
  };
}

/** Everything the Clients list and its client-detail dialog need, in one
 * eager query -- the dialog is "mount only while open" off data already in
 * the list's state, same pattern as Quotes/Projects/Invoices, so it needs no
 * separate fetch-on-open. Fine at agency scale (tens to low hundreds of
 * clients, not a paginated CRM table). */
export async function getClientList(companyId: string): Promise<ClientDTO[]> {
  const rows = await prisma.contact.findMany({
    where: { companyId },
    select: clientSelect,
    orderBy: { firstName: "asc" },
  });
  return rows.map(toClientDTO);
}
