import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSuperAdmin, isApiError } from "@/lib/api-guard";

export async function GET(req: NextRequest) {
  const session = await requireApiSuperAdmin(req, { mutate: false });
  if (isApiError(session)) return session;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const validStatuses = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"];

  const inquiries = await prisma.platformInquiry.findMany({
    where: status && validStatuses.includes(status) ? { status: status as "NEW" | "CONTACTED" | "CONVERTED" | "CLOSED" } : {},
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ inquiries });
}
