import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { ContactDetailClient } from "./contact-detail-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const contact = await prisma.contact.findUnique({ where: { id }, select: { firstName: true, lastName: true } });
  return { title: contact ? `${contact.firstName} ${contact.lastName ?? ""}`.trim() : "Contact" };
}

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCompanyContext();
  const { id } = await params;

  if (!ctx.can("contacts", "view")) notFound();

  const [contact, activity, tags, users] = await Promise.all([
    prisma.contact.findFirst({
      where: { id, companyId: ctx.company.id },
      include: {
        tags: { include: { tag: true } },
        notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true } } } },
        customFieldValues: { include: { customField: true } },
        assignedUser: { select: { id: true, name: true } },
        tasks: { orderBy: { createdAt: "desc" }, take: 20 },
        pipelineCards: { include: { pipeline: true, stage: true } },
        formSubmissions: { orderBy: { createdAt: "desc" }, take: 20, include: { form: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: { companyId: ctx.company.id, targetType: "Contact", targetId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { actor: { select: { name: true } } },
    }),
    prisma.tag.findMany({ where: { companyId: ctx.company.id }, orderBy: { name: "asc" } }),
    prisma.membership.findMany({
      where: { companyId: ctx.company.id, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  if (!contact) notFound();

  return (
    <ContactDetailClient
      contact={contact}
      activity={activity}
      allTags={tags}
      users={users.map((m) => m.user)}
      canEdit={ctx.can("contacts", "edit")}
      canDelete={ctx.can("contacts", "delete")}
    />
  );
}
