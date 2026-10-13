import { NextRequest, NextResponse } from "next/server";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { getInvoiceById } from "@/lib/clickco/invoices";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "invoices", action: "view" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const invoice = await getInvoiceById(ctx.company.id, id);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invoice });
}
