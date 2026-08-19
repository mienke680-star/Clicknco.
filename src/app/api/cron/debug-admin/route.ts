import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** TEMPORARY read-only diagnostic route -- to be removed once the production
 * login issue is understood. Call with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = process.env.SUPER_ADMIN_EMAIL;
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      status: true,
      platformRole: true,
      failedLoginCount: true,
      lockedUntil: true,
      mustChangePassword: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
    },
  });

  const userCount = await prisma.user.count();
  const companyCount = await prisma.company.count();

  return NextResponse.json({ envEmail: email, user, userCount, companyCount });
}
