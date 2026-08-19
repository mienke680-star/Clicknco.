import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { ContactsClient } from "./contacts-client";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage() {
  const ctx = await requireCompanyContext();

  const [tags, users] = await Promise.all([
    prisma.tag.findMany({ where: { companyId: ctx.company.id }, orderBy: { name: "asc" } }),
    prisma.membership.findMany({
      where: { companyId: ctx.company.id, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <ContactsClient
      tags={tags}
      users={users.map((m) => m.user)}
      canCreate={ctx.can("contacts", "create")}
      canEdit={ctx.can("contacts", "edit")}
      canDelete={ctx.can("contacts", "delete")}
      canExport={ctx.can("contacts", "export")}
    />
  );
}
