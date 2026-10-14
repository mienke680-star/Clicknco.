import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { calendarEventUpdateSchema } from "@/lib/validation/clickco";
import { assertContactInCompany } from "@/lib/tenant-refs";
import { sastToInstant, dateKeyOfInstant, timeKeyOfInstant } from "@/lib/clickco/calendar-calc";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "calendar", action: "view" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const event = await prisma.calendarEvent.findFirst({ where: { id, companyId: ctx.company.id }, include: { contact: true } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ event });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "calendar", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.calendarEvent.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = calendarEventUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const { title, date, time, durationMinutes, kind, contactId, notes, done } = parsed.data;

  if (contactId) {
    const refError = await assertContactInCompany(ctx.company.id, contactId);
    if (refError) return NextResponse.json({ error: refError }, { status: 400 });
  }

  const startAt = date !== undefined || time !== undefined ? sastToInstant(date ?? dateKeyOfInstant(existing.startAt), time ?? timeKeyOfInstant(existing.startAt)) : undefined;

  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(notes !== undefined ? { notes: notes || null } : {}),
      ...(startAt ? { startAt } : {}),
      ...(durationMinutes !== undefined ? { durationMinutes } : {}),
      ...(kind !== undefined ? { kind } : {}),
      ...(contactId !== undefined ? { contactId: contactId || null } : {}),
      ...(done !== undefined ? { done } : {}),
    },
    include: { contact: true },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "calendarevent.updated", targetType: "CalendarEvent", targetId: id, ip, userAgent });

  return NextResponse.json({ event });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "calendar", action: "delete" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.calendarEvent.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.calendarEvent.delete({ where: { id } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "calendarevent.deleted",
    targetType: "CalendarEvent",
    targetId: id,
    metadata: { title: existing.title },
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
