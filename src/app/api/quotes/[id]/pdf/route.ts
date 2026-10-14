import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { getQuoteById } from "@/lib/clickco/quotes";
import { renderQuotePdf } from "@/lib/pdf/quote-document";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "quotes", action: "view" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const quote = await getQuoteById(ctx.company.id, id);
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await prisma.businessSettings.findUnique({ where: { companyId: ctx.company.id } });
  const buffer = await renderQuotePdf(quote, settings);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
