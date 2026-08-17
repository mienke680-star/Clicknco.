import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req);
  if (isApiError(ctx)) return ctx;

  await prisma.notification.updateMany({
    where: { companyId: ctx.company.id, readAt: null, OR: [{ userId: ctx.user.id }, { userId: null }] },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
