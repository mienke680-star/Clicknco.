import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSuperAdmin, isApiError } from "@/lib/api-guard";
import { companyUpdateSchema } from "@/lib/validation/companies";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSuperAdmin(req, { mutate: false });
  if (isApiError(session)) return session;
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: { select: { memberships: true, contacts: true, pipelines: true, tasks: true } },
      memberships: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, lastLoginAt: true } }, staffRole: { select: { id: true, name: true } } },
      },
      staffRoles: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      billingRecords: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ company });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;
  const { id } = await params;

  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = companyUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  if (data.slug && data.slug !== existing.slug) {
    const taken = await prisma.company.findUnique({ where: { slug: data.slug }, select: { id: true } });
    if (taken) return NextResponse.json({ error: "That slug is already in use." }, { status: 409 });
  }
  if (data.subdomain && data.subdomain !== existing.subdomain) {
    const taken = await prisma.company.findUnique({ where: { subdomain: data.subdomain }, select: { id: true } });
    if (taken) return NextResponse.json({ error: "That subdomain is already taken by another company." }, { status: 409 });
  }

  const company = await prisma.company.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.subdomain !== undefined ? { subdomain: data.subdomain } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.billingStatus !== undefined ? { billingStatus: data.billingStatus } : {}),
      ...(data.industry !== undefined ? { industry: data.industry || null } : {}),
      ...(data.contactPerson !== undefined ? { contactPerson: data.contactPerson || null } : {}),
      ...(data.contactEmail !== undefined ? { contactEmail: data.contactEmail || null } : {}),
      ...(data.contactPhone !== undefined ? { contactPhone: data.contactPhone || null } : {}),
      ...(data.website !== undefined ? { website: data.website || null } : {}),
      ...(data.address1 !== undefined ? { address1: data.address1 || null } : {}),
      ...(data.address2 !== undefined ? { address2: data.address2 || null } : {}),
      ...(data.city !== undefined ? { city: data.city || null } : {}),
      ...(data.state !== undefined ? { state: data.state || null } : {}),
      ...(data.postalCode !== undefined ? { postalCode: data.postalCode || null } : {}),
      ...(data.country !== undefined ? { country: data.country || null } : {}),
      ...(data.timezone !== undefined ? { timezone: data.timezone || "UTC" } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl || null } : {}),
      ...(data.faviconUrl !== undefined ? { faviconUrl: data.faviconUrl || null } : {}),
      ...(data.brandPrimaryColor !== undefined ? { brandPrimaryColor: data.brandPrimaryColor } : {}),
      ...(data.brandAccentColor !== undefined ? { brandAccentColor: data.brandAccentColor } : {}),
      ...(data.brandFont !== undefined ? { brandFont: data.brandFont } : {}),
      ...(data.portalName !== undefined ? { portalName: data.portalName || null } : {}),
      ...(data.loginHeadline !== undefined ? { loginHeadline: data.loginHeadline || null } : {}),
      ...(data.loginImageUrl !== undefined ? { loginImageUrl: data.loginImageUrl || null } : {}),
      ...(data.portalFooterText !== undefined ? { portalFooterText: data.portalFooterText || null } : {}),
      ...(data.emailFromName !== undefined ? { emailFromName: data.emailFromName || null } : {}),
      ...(data.emailFromAddress !== undefined ? { emailFromAddress: data.emailFromAddress || null } : {}),
      ...(data.packageName !== undefined ? { packageName: data.packageName || null } : {}),
      ...(data.setupFee !== undefined ? { setupFee: data.setupFee === "" ? null : Number(data.setupFee) } : {}),
      ...(data.monthlyFee !== undefined ? { monthlyFee: data.monthlyFee === "" ? null : Number(data.monthlyFee) } : {}),
      ...(data.currency !== undefined ? { currency: data.currency || "USD" } : {}),
      ...(data.nextBillingDate !== undefined ? { nextBillingDate: data.nextBillingDate ? new Date(data.nextBillingDate) : null } : {}),
    },
  });

  const { ip, userAgent } = requestMeta(req);
  if (data.status && data.status !== existing.status) {
    const action =
      data.status === "SUSPENDED"
        ? "company.suspended"
        : data.status === "ARCHIVED"
          ? "company.archived"
          : data.status === "ACTIVE" && existing.status === "SETUP"
            ? "company.launched"
            : data.status === "ACTIVE"
              ? "company.reactivated"
              : "company.updated";
    await writeAuditLog({
      companyId: company.id,
      actorUserId: session.user.id,
      action,
      targetType: "Company",
      targetId: company.id,
      metadata: { from: existing.status, to: data.status },
      ip,
      userAgent,
    });
  } else {
    await writeAuditLog({
      companyId: company.id,
      actorUserId: session.user.id,
      action: "company.updated",
      targetType: "Company",
      targetId: company.id,
      ip,
      userAgent,
    });
  }

  return NextResponse.json({ company });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;
  const { id } = await params;

  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const confirmName = typeof body?.confirmName === "string" ? body.confirmName.trim() : "";
  if (confirmName !== existing.name) {
    return NextResponse.json({ error: "Type the company's exact name to confirm deletion." }, { status: 400 });
  }

  const { ip, userAgent } = requestMeta(req);
  // Written before the delete: Company FK is ON DELETE SET NULL for AuditLog,
  // so this row survives the cascade and remains in the platform activity log.
  await writeAuditLog({
    companyId: id,
    actorUserId: session.user.id,
    action: "company.deleted",
    targetType: "Company",
    targetId: id,
    metadata: { name: existing.name, subdomain: existing.subdomain },
    ip,
    userAgent,
  });

  await prisma.company.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
