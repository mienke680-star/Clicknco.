import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderQuotePdf } from "@/lib/pdf/quote-document";
import { getQuoteById } from "@/lib/clickco/quotes";

/** Unauthenticated, client-facing quote link -- gated by a dedicated random
 * shareToken (not the row's own id), so a leaked link can be revoked by
 * rotating the token without touching the FK-referenced primary key. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("t");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const quoteRow = await prisma.quote.findFirst({ where: { id, shareToken: token }, select: { companyId: true } });
  if (!quoteRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const quote = await getQuoteById(quoteRow.companyId, id);
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await prisma.businessSettings.findUnique({ where: { companyId: quoteRow.companyId } });
  const buffer = await renderQuotePdf(quote, settings);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
