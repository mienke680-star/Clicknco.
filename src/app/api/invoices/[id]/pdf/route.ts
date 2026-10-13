import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { getInvoiceById } from "@/lib/clickco/invoices";
import { renderInvoicePdf } from "@/lib/pdf/invoice-document";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "invoices", action: "view" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const invoice = await getInvoiceById(ctx.company.id, id);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await prisma.businessSettings.findUnique({ where: { companyId: ctx.company.id } });
  const buffer = await renderInvoicePdf(invoice, settings);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
