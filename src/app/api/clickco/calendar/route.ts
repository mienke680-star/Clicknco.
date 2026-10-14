import { NextRequest, NextResponse } from "next/server";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { getCalendarItems } from "@/lib/clickco/calendar";
import { sastToInstant } from "@/lib/clickco/calendar-calc";

/** Aggregated Calendar items for a date range: ?from=YYYY-MM-DD&to=YYYY-MM-DD,
 * both inclusive, interpreted as Click & Co's own timezone (see
 * calendar-calc.ts). Merges CalendarEvent rows with computed items from
 * Invoice/Project/RecurringService -- see getCalendarItems(). */
export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "calendar", action: "view" });
  if (isApiError(ctx)) return ctx;

  const fromStr = req.nextUrl.searchParams.get("from");
  const toStr = req.nextUrl.searchParams.get("to");
  if (!fromStr || !toStr) return NextResponse.json({ error: "Missing from/to" }, { status: 400 });

  const from = sastToInstant(fromStr, "00:00");
  const to = sastToInstant(toStr, "23:59");
  const items = await getCalendarItems(ctx.company.id, ctx.can, from, to);
  return NextResponse.json({ items });
}
