import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { getCalendarItems } from "@/lib/clickco/calendar";
import { monthGridDays, todayUtcDay, utcDayAdd, sastToInstant, dateKeyOfUtcDay } from "@/lib/clickco/calendar-calc";
import { CalendarClient } from "./calendar-client";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const ctx = await requireCompanyContext();
  const companyId = ctx.company.id;

  const today = todayUtcDay();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();

  // Fetch enough to cover both the current month's grid and the 28-day
  // agenda window up front, so switching modes or re-opening today doesn't
  // need an immediate re-fetch -- only navigating away from "today" does.
  const gridDays = monthGridDays(year, month);
  const rangeStart = gridDays[0]!;
  const agendaEnd = utcDayAdd(today, 28);
  const rangeEnd = gridDays[gridDays.length - 1]! > agendaEnd ? gridDays[gridDays.length - 1]! : agendaEnd;

  const [items, contacts] = await Promise.all([
    getCalendarItems(companyId, ctx.can, sastToInstant(dateKeyOfUtcDay(rangeStart), "00:00"), sastToInstant(dateKeyOfUtcDay(rangeEnd), "23:59")),
    prisma.contact.findMany({ where: { companyId }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } }),
  ]);

  return (
    <CalendarClient
      initialItems={items}
      initialYear={year}
      initialMonth={month}
      contacts={contacts}
      canCreate={ctx.can("calendar", "create")}
      canEdit={ctx.can("calendar", "edit")}
      canDelete={ctx.can("calendar", "delete")}
    />
  );
}
