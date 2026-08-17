import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req);
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const notification = await prisma.notification.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
