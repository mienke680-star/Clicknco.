import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSuperAdmin, isApiError } from "@/lib/api-guard";
import { createDomainSchema } from "@/lib/validation/domains";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { generateToken } from "@/lib/crypto";
import { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const session = await requireApiSuperAdmin(req, { mutate: false });
  if (isApiError(session)) return session;

  const domains = await prisma.domain.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ domains });
}

export async function POST(req: NextRequest) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = createDomainSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: parsed.data.companyId }, select: { id: true } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const { token } = generateToken(16);

  try {
    const domain = await prisma.domain.create({
      data: {
        companyId: parsed.data.companyId,
        domain: parsed.data.domain,
        type: parsed.data.type,
        verificationToken: token,
      },
      include: { company: { select: { id: true, name: true } } },
    });

    const { ip, userAgent } = requestMeta(req);
    await writeAuditLog({
      companyId: parsed.data.companyId,
      actorUserId: session.user.id,
      action: "domain.added",
      targetType: "Domain",
      targetId: domain.id,
      ip,
      userAgent,
    });

    return NextResponse.json({ domain }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "This domain is already connected to a company." }, { status: 409 });
    }
    throw err;
  }
}
