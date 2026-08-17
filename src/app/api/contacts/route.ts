import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { contactSchema } from "@/lib/validation/contacts";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { runAutomationTrigger } from "@/lib/automation/engine";
import type { Prisma } from "@/generated/prisma/client";

const SORT_FIELDS = { name: "firstName", created: "createdAt", activity: "lastActivityAt" } as const;

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "contacts", action: "view" });
  if (isApiError(ctx)) return ctx;

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const tagIds = sp.getAll("tag");
  const sortKey = (sp.get("sort") as keyof typeof SORT_FIELDS) || "created";
  const order = sp.get("order") === "asc" ? "asc" : "desc";
  const offset = Math.max(0, Number(sp.get("offset")) || 0);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 50));

  const where: Prisma.ContactWhereInput = {
    companyId: ctx.company.id,
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(tagIds.length ? { tags: { some: { tagId: { in: tagIds } } } } : {}),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { [SORT_FIELDS[sortKey] ?? "createdAt"]: order },
      skip: offset,
      take: limit,
      include: { tags: { include: { tag: true } }, assignedUser: { select: { id: true, name: true } } },
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({ contacts, total, hasMore: offset + contacts.length < total });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "contacts", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { tagIds, ...data } = parsed.data;

  const contact = await prisma.contact.create({
    data: {
      companyId: ctx.company.id,
      firstName: data.firstName,
      lastName: data.lastName || null,
      email: data.email || null,
      phone: data.phone || null,
      company: data.company || null,
      address: data.address || null,
      leadSource: data.leadSource || null,
      status: data.status || "Lead",
      assignedUserId: data.assignedUserId || null,
      tags: tagIds?.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
    include: { tags: { include: { tag: true } } },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "contact.created",
    targetType: "Contact",
    targetId: contact.id,
    ip,
    userAgent,
  });
  await notify({
    companyId: ctx.company.id,
    type: "NEW_LEAD",
    title: `New contact: ${contact.firstName} ${contact.lastName ?? ""}`.trim(),
    link: `/portal/contacts/${contact.id}`,
  });
  await runAutomationTrigger(ctx.company.id, "RECORD_CREATED", { contactId: contact.id, moduleKey: "contacts" });

  return NextResponse.json({ contact }, { status: 201 });
}
