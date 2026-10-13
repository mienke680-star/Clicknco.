import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderInvoicePdf } from "@/lib/pdf/invoice-document";
import { getInvoiceById } from "@/lib/clickco/invoices";

/** Unauthenticated, client-facing invoice link -- gated by a dedicated random
 * shareToken (not the row's own id), so a leaked link can be revoked by
 * rotating the token without touching the FK-referenced primary key. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("t");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const invoiceRow = await prisma.invoice.findFirst({ where: { id, shareToken: token }, select: { companyId: true } });
  if (!invoiceRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invoice = await getInvoiceById(invoiceRow.companyId, id);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await prisma.businessSettings.findUnique({ where: { companyId: invoiceRow.companyId } });
  const buffer = await renderInvoicePdf(invoice, settings);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
