import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "contacts", action: "delete" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const tag = await prisma.tag.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
