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
 * rather than reusing the classic portal's /api/search, which is scoped to
 * its own generic-CRM entities. No single module gates the whole route --
 * each section below checks its own ctx.can(), so a user who can't view
 * quotes still gets client/project/invoice results they're allowed to see. */
export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, {});
  if (isApiError(ctx)) return ctx;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ results: [] });

  const results: HubSearchResult[] = [];
  const contactNameMatch = { OR: [{ contact: { firstName: { contains: q, mode: "insensitive" as const } } }, { contact: { lastName: { contains: q, mode: "insensitive" as const } } }] };

  if (ctx.can("quotes", "view")) {
    const quotes = await prisma.quote.findMany({
      where: { companyId: ctx.company.id, OR: [{ number: { contains: q, mode: "insensitive" } }, ...contactNameMatch.OR] },
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

  if (ctx.can("invoices", "view")) {
    const invoices = await prisma.invoice.findMany({
      where: { companyId: ctx.company.id, OR: [{ number: { contains: q, mode: "insensitive" } }, ...contactNameMatch.OR] },
      include: { contact: true },
      take: 8,
    });
    for (const invoice of invoices) {
      results.push({
        id: `invoice-${invoice.id}`,
        label: invoice.number,
        sub: `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""} · ${money(toNumber(invoice.amount))}`,
        group: "Invoices",
        href: `/portal/invoices?open=${invoice.id}`,
      });
    }
  }

  if (ctx.can("projects", "view")) {
    const projects = await prisma.project.findMany({
      where: { companyId: ctx.company.id, OR: [{ name: { contains: q, mode: "insensitive" } }, ...contactNameMatch.OR] },
      include: { contact: true },
      take: 8,
    });
    for (const project of projects) {
      results.push({
        id: `project-${project.id}`,
        label: project.name,
        sub: `${project.contact.firstName} ${project.contact.lastName ?? ""}`,
        group: "Projects",
        href: `/portal/projects?open=${project.id}`,
      });
    }
  }

  if (ctx.can("contacts", "view")) {
    const contacts = await prisma.contact.findMany({
      where: {
        companyId: ctx.company.id,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
    });
    for (const contact of contacts) {
      results.push({
        id: `client-${contact.id}`,
        label: `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
        sub: contact.company || contact.email || contact.phone || "",
        group: "Clients",
        href: `/portal/contacts?open=${contact.id}`,
      });
    }
  }

  return NextResponse.json({ results });
}
