import "server-only";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/utils";
import { invoiceBalance } from "@/lib/clickco/invoice-calc";
import { dateKeyOfInstant, timeKeyOfInstant, type CalendarItem } from "@/lib/clickco/calendar-calc";
import type { PermissionAction } from "@/lib/auth/rbac";
import type { CalendarEvent, Contact } from "@/generated/prisma/client";

export type CalendarEventDTO = CalendarEvent & { contact: Contact | null };

const calendarEventInclude = { contact: true } as const;

export async function getCalendarEvents(companyId: string, from: Date, to: Date): Promise<CalendarEventDTO[]> {
  return prisma.calendarEvent.findMany({
    where: { companyId, startAt: { gte: from, lte: to } },
    include: calendarEventInclude,
    orderBy: { startAt: "asc" },
  });
}

export interface CalendarItemWithDate extends CalendarItem {
  date: string; // "YYYY-MM-DD", local
}

/** Merges manually-created CalendarEvent rows with computed items from
 * Invoice/Project/RecurringService due-dates -- ported from hub.js's
 * eventsOn(), generalized from "one day" to a date range. Each source is
 * independently gated so a user missing one module still sees the rest. */
export async function getCalendarItems(companyId: string, can: (moduleKey: string, action: PermissionAction) => boolean, from: Date, to: Date): Promise<CalendarItemWithDate[]> {
  const items: CalendarItemWithDate[] = [];

  const events = await getCalendarEvents(companyId, from, to);
  for (const e of events) {
    items.push({
      id: e.id,
      kind: e.kind,
      label: e.title,
      sub: e.contact ? `${e.contact.firstName} ${e.contact.lastName ?? ""}`.trim() : "Click & Co (internal)",
      time: timeKeyOfInstant(e.startAt),
      done: e.done,
      date: dateKeyOfInstant(e.startAt),
    });
  }

  if (can("invoices", "view")) {
    const invoices = await prisma.invoice.findMany({
      where: { companyId, dueDate: { gte: from, lte: to } },
      include: { contact: true, payments: true },
    });
    for (const i of invoices) {
      const balance = invoiceBalance({ amount: toNumber(i.amount), payments: i.payments.map((p) => ({ amount: toNumber(p.amount) })) });
      if (balance <= 0) continue;
      items.push({
        id: i.id,
        kind: "MONEY",
        label: `${i.number} due`,
        sub: `${i.contact.firstName} ${i.contact.lastName ?? ""}`.trim(),
        time: "",
        done: false,
        date: dateKeyOfInstant(i.dueDate),
        href: `/portal/invoices?open=${i.id}`,
      });
    }
  }

  if (can("projects", "view")) {
    const projects = await prisma.project.findMany({
      where: { companyId, dueDate: { gte: from, lte: to }, stage: { not: "LAUNCHED" } },
      include: { contact: true },
    });
    for (const p of projects) {
      items.push({
        id: p.id,
        kind: "DEADLINE",
        label: `${p.contact.firstName} ${p.contact.lastName ?? ""}: ${p.name} due`.trim(),
        sub: "Project deadline",
        time: "",
        done: false,
        date: dateKeyOfInstant(p.dueDate),
        href: `/portal/projects?open=${p.id}`,
      });
    }
  }

  if (can("consulting", "view")) {
    const services = await prisma.recurringService.findMany({
      where: { companyId, nextReviewAt: { gte: from, lte: to } },
      include: { contact: true },
    });
    for (const s of services) {
      items.push({
        id: s.id,
        kind: "REVIEW",
        label: `${s.contact.firstName} ${s.contact.lastName ?? ""} consulting review`.trim(),
        sub: s.cadenceLabel,
        time: "",
        done: false,
        date: dateKeyOfInstant(s.nextReviewAt),
        href: `/portal/consulting?open=${s.contactId}`,
      });
    }
  }

  return items.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
}
