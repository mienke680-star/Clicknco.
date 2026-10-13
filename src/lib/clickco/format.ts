import { toNumber } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

type Money = Prisma.Decimal | number | string | null | undefined;

/** Deterministic ZAR formatting ("R 3 950", "R 1 234,50") -- built by hand
 * rather than Intl.NumberFormat("en-ZA", ...): that locale's thousands
 * separator isn't rendered consistently between Node's and a browser's ICU
 * data, which causes a server/client hydration mismatch on every price. */
export function money(value: Money): string {
  const n = toNumber(value);
  const rounded = Math.round(n * 100) / 100;
  const hasCents = Math.round(rounded * 100) % 100 !== 0;
  const [intPart, decPart] = rounded.toFixed(hasCents ? 2 : 0).split(".");
  const grouped = (intPart ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decPart ? `R ${grouped},${decPart}` : `R ${grouped}`;
}

export function dShort(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d);
}

export function dLong(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function dWeek(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short" }).format(d);
}

/** "today" / "tomorrow" / "in N days" / "N days ago", relative to local midnight. */
export function relDay(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  const sod = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diff = Math.round((sod(d).getTime() - sod(new Date()).getTime()) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
}

/** Up to 2 uppercase initials from a name, for a mini-avatar. Ported from hub.js. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Deterministic av0..av4 class from an id's char codes, for mini-avatar
 * background color -- same id always gets the same color. Ported from hub.js. */
export function avatarClass(id: string): string {
  const sum = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return `av${sum % 5}`;
}
