import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false });
  if (isApiError(ctx)) return ctx;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { companyId: ctx.company.id, OR: [{ userId: ctx.user.id }, { userId: null }] },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({
      where: { companyId: ctx.company.id, readAt: null, OR: [{ userId: ctx.user.id }, { userId: null }] },
    }),
  ]);

  return NextResponse.json({ items, unreadCount });
}
