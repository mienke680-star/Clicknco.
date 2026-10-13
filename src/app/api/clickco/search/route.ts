import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { money } from "@/lib/clickco/format";
import { toNumber } from "@/lib/utils";

export interface HubSearchResult {
  id: string;
  label: string;
  sub: string;
  group: string;
  href: string;
}

/** Ctrl+K search across Hub entities. Grows alongside the Hub's own phases
 * (quotes now; invoices/projects/clients as those screens land) rather than
 * reusing the classic portal's /api/search, which is scoped to its own
 * generic-CRM entities. */
export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "quotes", action: "view" });
  if (isApiError(ctx)) return ctx;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ results: [] });

  const results: HubSearchResult[] = [];

  if (ctx.can("quotes", "view")) {
    const quotes = await prisma.quote.findMany({
      where: {
        companyId: ctx.company.id,
        OR: [{ number: { contains: q, mode: "insensitive" } }, { contact: { firstName: { contains: q, mode: "insensitive" } } }, { contact: { lastName: { contains: q, mode: "insensitive" } } }],
      },
      include: { contact: true },
      take: 8,
    });
    for (const quote of quotes) {
      results.push({
        id: `quote-${quote.id}`,
        label: quote.number,
        sub: `${quote.contact.firstName} ${quote.contact.lastName ?? ""} · ${money(toNumber(quote.total))}`,
        group: "Quotes",
        href: `/portal/quotes?open=${quote.id}`,
      });
    }
  }

  return NextResponse.json({ results });
}
