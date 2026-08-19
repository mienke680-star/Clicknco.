import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSuperAdmin, isApiError } from "@/lib/api-guard";
import { inquiryStatusSchema } from "@/lib/validation/site";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;
  const { id } = await params;

  const existing = await prisma.platformInquiry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = inquiryStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const inquiry = await prisma.platformInquiry.update({ where: { id }, data: { status: parsed.data.status } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "site.inquiry_status_changed",
    targetType: "PlatformInquiry",
    targetId: id,
    metadata: { status: parsed.data.status },
    ip,
    userAgent,
  });

  return NextResponse.json({ inquiry });
}
