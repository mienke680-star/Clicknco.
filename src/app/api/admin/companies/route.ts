import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSuperAdmin, isApiError } from "@/lib/api-guard";
import { companyCreateSchema } from "@/lib/validation/companies";
import { provisionNewCompany } from "@/lib/companies/provision";
import { inviteMember } from "@/lib/companies/invite";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import type { Prisma, CompanyStatus } from "@/generated/prisma/client";

const STATUS_VALUES: CompanyStatus[] = ["SETUP", "ACTIVE", "SUSPENDED", "ARCHIVED"];

export async function GET(req: NextRequest) {
  const session = await requireApiSuperAdmin(req, { mutate: false });
  if (isApiError(session)) return session;

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const status = sp.get("status");

  const where: Prisma.CompanyWhereInput = {
    ...(status && STATUS_VALUES.includes(status as CompanyStatus) ? { status: status as CompanyStatus } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { subdomain: { contains: q, mode: "insensitive" } },
            { contactEmail: { contains: q, mode: "insensitive" } },
            { contactPerson: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const companies = await prisma.company.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { memberships: true, contacts: true } } },
  });

  return NextResponse.json({ companies });
}

async function uniqueSlug(base: string) {
  const root = slugify(base) || "company";
  let candidate = root;
  let n = 1;
  while (await prisma.company.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

export async function POST(req: NextRequest) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = companyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const subdomainTaken = await prisma.company.findUnique({ where: { subdomain: data.subdomain }, select: { id: true } });
  if (subdomainTaken) {
    return NextResponse.json({ error: "That subdomain is already taken by another company." }, { status: 409 });
  }
  if (data.adminEmail) {
    const emailTaken = await prisma.user.findUnique({ where: { email: data.adminEmail }, select: { id: true } });
    if (emailTaken) {
      return NextResponse.json({ error: "That admin email already has a Click & Co account. Add them from the company's Team tab instead." }, { status: 409 });
    }
  }

  const slug = await uniqueSlug(data.name);

  const company = await prisma.company.create({
    data: {
      name: data.name,
      slug,
      subdomain: data.subdomain,
      industry: data.industry || null,
      contactPerson: data.contactPerson || null,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      website: data.website || null,
      address1: data.address1 || null,
      address2: data.address2 || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      timezone: data.timezone || "UTC",
      notes: data.notes || null,
      logoUrl: data.logoUrl || null,
      faviconUrl: data.faviconUrl || null,
      ...(data.brandPrimaryColor ? { brandPrimaryColor: data.brandPrimaryColor } : {}),
      ...(data.brandAccentColor ? { brandAccentColor: data.brandAccentColor } : {}),
      ...(data.brandFont ? { brandFont: data.brandFont } : {}),
      portalName: data.portalName || null,
      loginHeadline: data.loginHeadline || null,
      packageName: data.packageName || null,
      setupFee: data.setupFee !== undefined && data.setupFee !== "" ? Number(data.setupFee) : null,
      monthlyFee: data.monthlyFee !== undefined && data.monthlyFee !== "" ? Number(data.monthlyFee) : null,
      currency: data.currency || "USD",
    },
  });

  await provisionNewCompany(company.id);

  let invited: { email: string; status: string } | null = null;
  if (data.adminEmail && data.adminName) {
    try {
      const result = await inviteMember({
        companyId: company.id,
        companyName: company.name,
        name: data.adminName,
        email: data.adminEmail,
        role: "ADMIN",
        invitedByUserId: session.user.id,
        invitedByName: session.user.name,
      });
      invited = { email: data.adminEmail, status: result.status };
    } catch (err) {
      console.error("Failed to invite initial admin during company creation:", err);
    }
  }

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: company.id,
    actorUserId: session.user.id,
    action: "company.created",
    targetType: "Company",
    targetId: company.id,
    ip,
    userAgent,
  });

  return NextResponse.json({ company, invited }, { status: 201 });
}
