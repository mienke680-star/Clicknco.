import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "settings", action: "settings" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const field = await prisma.customField.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!field) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.customField.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
