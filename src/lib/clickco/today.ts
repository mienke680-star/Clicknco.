import "server-only";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/utils";
import { invoiceBalance, invoiceStatus } from "@/lib/clickco/invoice-calc";
import { dateKeyOfInstant, todayKey, timeKeyOfInstant } from "@/lib/clickco/calendar-calc";
import type { PermissionAction } from "@/lib/auth/rbac";
import type { CalendarEvent, Contact } from "@/generated/prisma/client";

export interface NeedsYouItem {
  id: string;
  tone: "bad" | "warn" | "info" | "violet";
  icon: "alert-triangle" | "file-text" | "clock" | "clipboard-check" | "calendar-event";
  title: string;
  sub: string;
  label: string;
  href?: string;
  /** Set only for the one action handled inline on Today itself (marking a
   * missed schedule item done) rather than by navigating to its own screen. */
  toggleCalendarEventId?: string;
}

/** Ported from hub.js's needsYou() -- each source independently gated by its
 * own permission, same pattern as getCalendarItems(). */
export async function getNeedsYou(companyId: string, can: (moduleKey: string, action: PermissionAction) => boolean): Promise<NeedsYouItem[]> {
  const items: NeedsYouItem[] = [];
  const now = new Date();

  if (can("invoices", "view")) {
    const invoices = await prisma.invoice.findMany({
      where: { companyId, dueDate: { lt: now } },
      include: { contact: true, payments: true },
    });
    for (const i of invoices) {
      const balance = invoiceBalance({ amount: toNumber(i.amount), payments: i.payments.map((p) => ({ amount: toNumber(p.amount) })) });
      if (balance <= 0) continue;
      const daysLate = Math.max(1, Math.round((now.getTime() - i.dueDate.getTime()) / 86400000));
      items.push({
        id: i.id,
        tone: "bad",
        icon: "alert-triangle",
        title: `${i.contact.firstName} ${i.contact.lastName ?? ""} owes ${moneyLabel(balance)}`.trim(),
        sub: `${i.number}, ${daysLate} ${daysLate === 1 ? "day" : "days"} overdue${i.remindedAt ? `, reminded ${relDayLabel(i.remindedAt, now)}` : ""}`,
        label: "Remind",
        href: `/portal/invoices?open=${i.id}`,
      });
    }
  }

  if (can("quotes", "view")) {
    const quotes = await prisma.quote.findMany({
      where: { companyId, status: { in: ["SENT", "VIEWED"] } },
      include: { contact: true },
    });
    for (const q of quotes) {
      const daysSince = Math.round((now.getTime() - q.issuedAt.getTime()) / 86400000);
      if (daysSince < 3) continue;
      items.push({
        id: q.id,
        tone: "warn",
        icon: "file-text",
        title: `Follow up ${q.contact.firstName} ${q.contact.lastName ?? ""}`.trim(),
        sub: `${q.number} ${q.status === "VIEWED" ? "was viewed" : "was sent"} ${daysSince} ${daysSince === 1 ? "day" : "days"} ago, ${moneyLabel(toNumber(q.total))}`,
        label: "Follow up",
        href: `/portal/quotes?open=${q.id}`,
      });
    }
  }

  if (can("projects", "view")) {
    const projects = await prisma.project.findMany({
      where: { companyId, stage: "WAITING_FOR_CLIENT" },
      include: { contact: true },
    });
    for (const p of projects) {
      items.push({
        id: p.id,
        tone: "info",
        icon: "clock",
        title: `${p.contact.firstName} ${p.contact.lastName ?? ""} is holding up ${p.name}`.trim(),
        sub: `Waiting for: ${p.waitingNote || "client input"}`,
        label: "Nudge",
        href: `/portal/projects?open=${p.id}`,
      });
    }
  }

  if (can("consulting", "view")) {
    const briefs = await prisma.designBrief.findMany({
      where: { companyId, status: "APPROVAL" },
      include: { contact: true },
    });
    for (const d of briefs) {
      items.push({
        id: d.id,
        tone: "violet",
        icon: "clipboard-check",
        title: d.title,
        sub: `${d.contact.firstName} ${d.contact.lastName ?? ""}, waiting for approval`.trim(),
        label: "Approved",
        href: `/portal/consulting?open=${d.contactId}`,
      });
    }
  }

  if (can("calendar", "view")) {
    const missed = await prisma.calendarEvent.findMany({
      where: { companyId, done: false, startAt: { lt: now } },
      include: { contact: true },
    });
    for (const e of missed) {
      if (dateKeyOfInstant(e.startAt) >= todayKey()) continue;
      items.push({
        id: e.id,
        tone: "warn",
        icon: "calendar-event",
        title: e.title,
        sub: `Missed ${relDayLabel(e.startAt, now)}${e.contact ? `, ${e.contact.firstName} ${e.contact.lastName ?? ""}`.trimEnd() : ""}`,
        label: "Done",
        toggleCalendarEventId: e.id,
      });
    }
  }

  return items;
}

function moneyLabel(n: number): string {
  // Local, tiny formatter -- today.ts only needs it inside sentence-shaped
  // strings built server-side; the real money() lives in format.ts for UI use.
  const rounded = Math.round(n * 100) / 100;
  const grouped = Math.round(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `R ${grouped}`;
}

function relDayLabel(d: Date, now: Date): string {
  const days = Math.round((now.getTime() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export interface TodayStats {
  outstanding: number;
  unpaidCount: number;
  overdue: number;
  overdueCount: number;
  collectedThisMonth: number;
  openQuoteValue: number;
  openQuoteCount: number;
}

export async function getTodayStats(companyId: string): Promise<TodayStats> {
  const [invoices, quotes] = await Promise.all([
    prisma.invoice.findMany({ where: { companyId }, include: { payments: true } }),
    prisma.quote.findMany({ where: { companyId, status: { in: ["SENT", "VIEWED"] } }, select: { total: true } }),
  ]);

  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  let outstanding = 0;
  let unpaidCount = 0;
  let overdue = 0;
  let overdueCount = 0;
  let collectedThisMonth = 0;

  for (const i of invoices) {
    const dto = { amount: toNumber(i.amount), payments: i.payments.map((p) => ({ amount: toNumber(p.amount) })), dueDate: i.dueDate };
    const balance = invoiceBalance(dto);
    if (balance > 0) {
      outstanding += balance;
      unpaidCount += 1;
      if (invoiceStatus(dto, now) === "Overdue") {
        overdue += balance;
        overdueCount += 1;
      }
    }
    for (const p of i.payments) {
      if (dateKeyOfInstant(p.paidAt).slice(0, 7) === ym) collectedThisMonth += toNumber(p.amount);
    }
  }

  const openQuoteValue = quotes.reduce((s, q) => s + toNumber(q.total), 0);

  return { outstanding, unpaidCount, overdue, overdueCount, collectedThisMonth, openQuoteValue, openQuoteCount: quotes.length };
}

export type TodayScheduleItem = CalendarEvent & { contact: Contact | null; time: string };

export async function getTodaySchedule(companyId: string): Promise<TodayScheduleItem[]> {
  const rows = await prisma.calendarEvent.findMany({ where: { companyId }, include: { contact: true } });
  return rows
    .filter((e) => dateKeyOfInstant(e.startAt) === todayKey())
    .map((e) => ({ ...e, time: timeKeyOfInstant(e.startAt) }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export interface ActiveDeliveryItem {
  id: string;
  name: string;
  contactName: string;
  dueDate: Date;
  progress: number;
}

export async function getActiveDelivery(companyId: string): Promise<ActiveDeliveryItem[]> {
  const projects = await prisma.project.findMany({
    where: { companyId, stage: { not: "LAUNCHED" } },
    include: { contact: true, milestones: true },
    orderBy: { dueDate: "asc" },
    take: 4,
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    contactName: `${p.contact.firstName} ${p.contact.lastName ?? ""}`.trim(),
    dueDate: p.dueDate,
    progress: p.milestones.length ? Math.round((p.milestones.filter((m) => m.done).length / p.milestones.length) * 100) : 0,
  }));
}

export interface RecentActivityItem {
  id: string;
  action: string;
  actorName: string;
  createdAt: Date;
}

export async function getRecentActivity(companyId: string): Promise<RecentActivityItem[]> {
  const rows = await prisma.auditLog.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 4,
    include: { actor: { select: { name: true } } },
  });
  return rows.map((r) => ({ id: r.id, action: r.action, actorName: r.actor?.name ?? "System", createdAt: r.createdAt }));
}
