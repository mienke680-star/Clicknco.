import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { calendarEventCreateSchema } from "@/lib/validation/clickco";
import { assertContactInCompany } from "@/lib/tenant-refs";
import { getCalendarEvents } from "@/lib/clickco/calendar";
import { sastToInstant } from "@/lib/clickco/calendar-calc";
import { writeAuditLog, requestMeta } from "@/lib/audit";

/** ?date=YYYY-MM-DD returns that single day's events -- used by the event
 * dialog's overlap check. Without it, returns nothing (the aggregated
 * /api/clickco/calendar endpoint is what the Calendar screen itself uses). */
export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "calendar", action: "view" });
  if (isApiError(ctx)) return ctx;

  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ events: [] });

  const from = sastToInstant(date, "00:00");
  const to = sastToInstant(date, "23:59");
  const events = await getCalendarEvents(ctx.company.id, from, to);
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "calendar", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = calendarEventCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const { title, date, time, durationMinutes, kind, contactId, notes } = parsed.data;

  if (contactId) {
    const refError = await assertContactInCompany(ctx.company.id, contactId);
    if (refError) return NextResponse.json({ error: refError }, { status: 400 });
  }

  const event = await prisma.calendarEvent.create({
    data: {
      companyId: ctx.company.id,
      contactId: contactId || null,
      title,
      notes: notes || null,
      startAt: sastToInstant(date, time),
      durationMinutes,
      kind,
      createdByUserId: ctx.user.id,
    },
    include: { contact: true },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "calendarevent.created", targetType: "CalendarEvent", targetId: event.id, ip, userAgent });

  return NextResponse.json({ event });
}
