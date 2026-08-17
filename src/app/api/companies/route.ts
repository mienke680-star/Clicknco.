import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionContext } from "@/lib/auth/session";

/**
 * Minimal listing used by the company switcher. Super Admin sees every
 * company; anyone else only ever sees companies they actually belong to.
 * Full Companies CRUD (create/edit/suspend/archive) lives under /api/admin/companies.
 */
export async function GET() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.platformRole === "SUPER_ADMIN") {
    const companies = await prisma.company.findMany({
      select: { id: true, name: true, status: true, logoUrl: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ companies });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: session.userId, status: "ACTIVE" },
    include: { company: { select: { id: true, name: true, status: true, logoUrl: true } } },
  });
  return NextResponse.json({ companies: memberships.map((m) => m.company) });
}
