import type { Invoice, Payment, Contact } from "@/generated/prisma/client";

// Pure types + arithmetic only (no prisma import, no "server-only") so these
// are safe to import from client components too -- same split as
// quote-calc.ts vs quotes.ts, and milestones.ts's projectProgress vs projects.ts.

export type PaymentDTO = Omit<Payment, "amount"> & { amount: number };
export type InvoiceDTO = Omit<Invoice, "amount"> & {
  amount: number;
  contact: Contact;
  payments: PaymentDTO[];
};

// Minimal structural shapes (not Pick<InvoiceDTO, ...>) so these also accept
// the leaner invoice references the Clients screen loads -- any object with
// at least these fields works, full InvoiceDTO included.

/** Sum of all payments recorded against an invoice. Ported from hub.js's paid(). */
export function invoicePaid(invoice: { payments: { amount: number }[] }): number {
  return invoice.payments.reduce((sum, p) => sum + p.amount, 0);
}

/** Outstanding balance, never negative, rounded to cents. Ported from hub.js's balance(). */
export function invoiceBalance(invoice: { amount: number; payments: { amount: number }[] }): number {
  return Math.max(0, Math.round((invoice.amount - invoicePaid(invoice)) * 100) / 100);
}

export type InvoiceStatus = "Paid" | "Overdue" | "Part paid" | "Due";

/** Ported from hub.js's invStatus(). */
export function invoiceStatus(invoice: { amount: number; payments: { amount: number }[]; dueDate: Date | string }, today: Date = new Date()): InvoiceStatus {
  if (invoiceBalance(invoice) <= 0) return "Paid";
  if (new Date(invoice.dueDate).getTime() < today.getTime()) return "Overdue";
  if (invoice.payments.length) return "Part paid";
  return "Due";
}
