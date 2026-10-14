import type { ProjectStage, QuoteStatus } from "@/generated/prisma/client";

// Pure types + arithmetic only (no prisma import, no "server-only") so these
// are safe to import from client components too -- same split as
// quote-calc.ts vs quotes.ts, invoice-calc.ts vs invoices.ts, and
// milestones.ts's projectProgress vs projects.ts.

export interface ClientProjectRef {
  id: string;
  name: string;
  stage: ProjectStage;
}

export interface ClientQuoteRef {
  id: string;
  number: string;
  status: QuoteStatus;
  total: number;
}

export interface ClientInvoiceRef {
  id: string;
  number: string;
  amount: number;
  dueDate: Date;
  payments: { amount: number }[];
}

export interface ClientDTO {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string | null;
  clientNote: string | null;
  createdAt: Date;
  projects: ClientProjectRef[];
  quotes: ClientQuoteRef[];
  invoices: ClientInvoiceRef[];
}

/** Ported from hub.js's clientAttention(). Consulting health isn't wired in
 * yet (Phase 4), so that third condition is added once RecurringService
 * exists -- the other two are real today. */
export function clientNeedsAttention(client: Pick<ClientDTO, "invoices" | "projects">, today: Date = new Date()): boolean {
  const hasOverdueInvoice = client.invoices.some((i) => {
    const paid = i.payments.reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, Math.round((i.amount - paid) * 100) / 100);
    return balance > 0 && new Date(i.dueDate).getTime() < today.getTime();
  });
  const hasWaitingProject = client.projects.some((p) => p.stage === "WAITING_FOR_CLIENT");
  return hasOverdueInvoice || hasWaitingProject;
}

/** The project shown as a client's "current work": the first active
 * (non-Launched) project, or else their most recent project. Ported from
 * hub.js's vClients() inline logic. */
export function currentWorkFor(client: Pick<ClientDTO, "projects">): ClientProjectRef | undefined {
  return client.projects.find((p) => p.stage !== "LAUNCHED") ?? client.projects[0];
}

export function clientOwed(client: Pick<ClientDTO, "invoices">): number {
  return client.invoices.reduce((sum, i) => {
    const paid = i.payments.reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(0, Math.round((i.amount - paid) * 100) / 100);
  }, 0);
}

export function clientPaidToDate(client: Pick<ClientDTO, "invoices">): number {
  return client.invoices.reduce((sum, i) => sum + i.payments.reduce((s, p) => s + p.amount, 0), 0);
}
