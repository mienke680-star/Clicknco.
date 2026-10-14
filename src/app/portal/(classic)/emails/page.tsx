import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { EmailsClient } from "./emails-client";

export const metadata: Metadata = { title: "Emails" };

export default async function EmailsPage() {
  const ctx = await requireCompanyContext();

  const contacts = await prisma.contact.findMany({
    where: { companyId: ctx.company.id, email: { not: null } },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { firstName: "asc" },
    take: 500,
  });

  return (
    <EmailsClient
      contacts={contacts}
      canCreate={ctx.can("emails", "create")}
      canEdit={ctx.can("emails", "edit")}
      canDelete={ctx.can("emails", "delete")}
    />
  );
}
