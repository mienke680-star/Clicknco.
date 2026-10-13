import type { CalendarEventKind } from "@/generated/prisma/client";

// Pure date/parsing helpers only (no prisma import, no "server-only") so
// these are safe to import from client components -- same split as
// quote-calc.ts, invoice-calc.ts, client-calc.ts, consulting-calc.ts.
//
// Two different kinds of "date" are at play here, handled separately on
// purpose:
//  - Calendar math (which days a month grid shows, "add N days") is pure
//    Gregorian-calendar arithmetic over a {y, m, d} triple. It's done with
//    Date's UTC methods purely as a calculator -- those Date objects never
//    represent a real moment, so there's no ambient-timezone concern.
//  - A real event's time-of-day (an Invoice due date has none; a
//    CalendarEvent's startAt does) is anchored to a single fixed offset,
//    SAST (UTC+2, Click & Co's own timezone, no DST) -- not whichever
//    timezone happens to run the server or the viewer's browser. Without
//    this, the same instant could file onto different day-cells server-side
//    (likely UTC) vs. in a South African browser, especially near midnight.

const SAST_OFFSET_MINUTES = 120;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function dateKeyFromParts(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** A UTC-midnight marker standing in for the abstract calendar day {y,m,d} --
 * a calculator value, not a real moment. Use utcDayAdd/dateKeyOf on it. */
export function utcDay(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

export function utcDayAdd(day: Date, n: number): Date {
  return new Date(day.getTime() + n * 86400000);
}

export function dateKeyOfUtcDay(day: Date): string {
  return dateKeyFromParts(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate());
}

/** Converts a real UTC instant to its SAST wall-clock {y,m,d,h,min}. Accepts
 * a string too -- a value fetched through apiFetch/JSON.parse (as opposed to
 * one passed straight from a Server Component) is a plain ISO string, never
 * a real Date instance, the same gotcha format.ts's dShort/dLong/relDay
 * already guard against. */
function toSastParts(instant: Date | string) {
  const real = typeof instant === "string" ? new Date(instant) : instant;
  const sast = new Date(real.getTime() + SAST_OFFSET_MINUTES * 60000);
  return {
    y: sast.getUTCFullYear(),
    m: sast.getUTCMonth() + 1,
    d: sast.getUTCDate(),
    h: sast.getUTCHours(),
    min: sast.getUTCMinutes(),
  };
}

/** The "YYYY-MM-DD" day a real instant falls on, in Click & Co's own timezone. */
export function dateKeyOfInstant(instant: Date | string): string {
  const p = toSastParts(instant);
  return dateKeyFromParts(p.y, p.m, p.d);
}

/** The "HH:MM" time-of-day a real instant falls on, in Click & Co's own timezone. */
export function timeKeyOfInstant(instant: Date | string): string {
  const p = toSastParts(instant);
  return `${pad2(p.h)}:${pad2(p.min)}`;
}

/** Combines a "YYYY-MM-DD" date and "HH:MM" time, both meant as SAST
 * wall-clock, into the real UTC instant to store. Inverse of the two
 * functions above. */
export function sastToInstant(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number) as [number, number, number];
  const [h, min] = timeStr.split(":").map(Number) as [number, number];
  return new Date(Date.UTC(y, mo - 1, d, h, min) - SAST_OFFSET_MINUTES * 60000);
}

export function todayKey(): string {
  return dateKeyOfInstant(new Date());
}

/** "Today" as a UTC-day calendar marker, in Click & Co's own timezone --
 * never the viewer's or the server's ambient timezone (see file header). */
export function todayUtcDay(): Date {
  const p = toSastParts(new Date());
  return utcDay(p.y, p.m - 1, p.d);
}

/** The full set of day-cells a month grid shows for {y, m} (0-indexed month),
 * Monday-first, including the leading/trailing days that spill into
 * neighbouring months -- ported from hub.js's vCalendar() grid math. */
export function monthGridDays(y: number, m: number): Date[] {
  const first = utcDay(y, m, 1);
  const offset = (first.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => utcDayAdd(first, i - offset));
}

/** The aggregated Calendar screen shows more kinds than CalendarEvent itself
 * can store: MONEY (an invoice due) and REVIEW (a consulting review) are
 * computed at read time from Invoice/RecurringService, never persisted. */
export type CalendarItemKind = CalendarEventKind | "MONEY" | "REVIEW";

export const KIND_LABEL: Record<CalendarItemKind, string> = {
  TASK: "Task",
  MEETING: "Meeting",
  CLIENT_WORK: "Client work",
  DEADLINE: "Deadline",
  MONEY: "Payment due",
  REVIEW: "Consulting review",
};

export const KIND_PILL_TONE: Record<CalendarItemKind, string> = {
  TASK: "",
  MEETING: "info",
  CLIENT_WORK: "pink",
  DEADLINE: "warn",
  MONEY: "bad",
  REVIEW: "violet",
};

/** CSS class suffix for the month-grid chip/dot (.ev.<kind>, .dots i.<kind>) --
 * hub.css's own lowercase kind names, which don't match the Prisma enum's
 * SCREAMING_CASE values 1:1 (CLIENT_WORK -> client). */
export const KIND_CSS: Record<CalendarItemKind, string> = {
  TASK: "task",
  MEETING: "meeting",
  CLIENT_WORK: "client",
  DEADLINE: "deadline",
  MONEY: "money",
  REVIEW: "review",
};

export interface CalendarItem {
  id: string;
  kind: CalendarItemKind;
  label: string;
  sub: string;
  time: string; // "HH:MM" (SAST) or "" for all-day/no-time items
  done: boolean;
  href?: string; // deep link for computed items (invoice/project/consulting); omitted for CalendarEvent rows, which open an edit dialog instead
}

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180];

export function durationLabel(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = mins / 60;
  return `${h % 1 === 0 ? h : h.toFixed(1)} hour${h === 1 ? "" : "s"}`;
}

/** Does [start, start+dur) overlap any of the other same-day items passed in?
 * Ported from hub.js's checkOverlap() -- a warning, never a hard block. */
export function findOverlap(
  time: string,
  durationMinutes: number,
  others: { id: string; time: string; durationMinutes: number; title: string }[],
  selfId?: string,
): { title: string; time: string; durationMinutes: number } | undefined {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const start = toMin(time);
  const end = start + durationMinutes;
  return others.find((o) => {
    if (o.id === selfId) return false;
    const oStart = toMin(o.time);
    return oStart < end && oStart + o.durationMinutes > start;
  });
}

export interface ParsedQuickAdd {
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  kind: "TASK" | "MEETING" | "DEADLINE";
}

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Ported from hub.js's parseQuick() -- recognizes "tomorrow"/a weekday name,
 * a time (24h or am/pm), and a duration (Nh/Nmin), stripping each match out
 * of the free-text title as it goes. "now"/"today" are evaluated in SAST.
 * Client/contact matching is left to the caller (Today, in Phase 6) since it
 * needs the contact list. */
export function parseQuickAdd(text: string, now: Date = new Date()): ParsedQuickAdd {
  const nowParts = toSastParts(now);
  const nowDayOfWeek = new Date(Date.UTC(nowParts.y, nowParts.m - 1, nowParts.d)).getUTCDay();

  let s = ` ${text.trim()} `;
  let date = dateKeyFromParts(nowParts.y, nowParts.m, nowParts.d);
  let time: string | null = null;
  let durationMinutes: number | null = null;
  let m: RegExpMatchArray | null;

  const nowUtcDay = utcDay(nowParts.y, nowParts.m - 1, nowParts.d);

  if ((m = s.match(/\s(tomorrow|tmrw)\s/i))) {
    date = dateKeyOfUtcDay(utcDayAdd(nowUtcDay, 1));
    s = s.replace(m[0], " ");
  } else if ((m = s.match(/\s(today)\s/i))) {
    s = s.replace(m[0], " ");
  } else if ((m = s.match(/\s(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues|tue|wed|thurs|thur|thu|fri|sat|sun)\s/i))) {
    const want = DAY_NAMES.indexOf(m[1]!.slice(0, 3).toLowerCase());
    const delta = (want - nowDayOfWeek + 7) % 7 || 7;
    date = dateKeyOfUtcDay(utcDayAdd(nowUtcDay, delta));
    s = s.replace(m[0], " ");
  }

  if ((m = s.match(/\s(\d{1,2})[:.](\d{2})\s?(am|pm)?(?=\s)/i))) {
    let h = Number(m[1]);
    if (m[3]) h = (h % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0);
    time = `${pad2(h)}:${m[2]}`;
    s = s.replace(m[0], " ");
  } else if ((m = s.match(/\s(\d{1,2})\s?(am|pm)(?=\s)/i))) {
    const h = (Number(m[1]) % 12) + (m[2]!.toLowerCase() === "pm" ? 12 : 0);
    time = `${pad2(h)}:00`;
    s = s.replace(m[0], " ");
  }

  if ((m = s.match(/\s(\d+)\s?(?:h|hr|hrs|hour|hours)(?:\s?(\d{1,2})\s?(?:m|min|mins)?)?(?=\s)/i))) {
    durationMinutes = Number(m[1]) * 60 + Number(m[2] ?? 0);
    s = s.replace(m[0], " ");
  } else if ((m = s.match(/\s(\d{1,3})\s?(?:m|min|mins|minutes)(?=\s)/i))) {
    durationMinutes = Number(m[1]);
    s = s.replace(m[0], " ");
  }

  const title = s.replace(/\s+/g, " ").trim();
  const low = title.toLowerCase();

  if (!time) {
    if (date === dateKeyFromParts(nowParts.y, nowParts.m, nowParts.d)) {
      let mins = nowParts.h * 60 + (nowParts.min > 30 ? 60 : 30);
      if (nowParts.min === 0) mins = nowParts.h * 60 + 30;
      mins = Math.min(mins, 23 * 60);
      time = `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;
    } else {
      time = "09:00";
    }
  }

  const kind = /\b(call|meeting|review|kick-?off|session|catch-?up)\b/i.test(low) ? "MEETING" : /\b(due|deadline|deliver)\b/i.test(low) ? "DEADLINE" : "TASK";

  return { title, date, time, durationMinutes: durationMinutes ?? 30, kind };
}
