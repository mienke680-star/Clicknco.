import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { DocumentsClient } from "./documents-client";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const ctx = await requireCompanyContext();

  const contacts = await prisma.contact.findMany({
    where: { companyId: ctx.company.id },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
    take: 500,
  });

  return (
    <DocumentsClient
      contacts={contacts}
      canCreate={ctx.can("documents", "create")}
      canEdit={ctx.can("documents", "edit")}
      canDelete={ctx.can("documents", "delete")}
    />
  );
}
