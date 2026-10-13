import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { PipelinesClient } from "./pipelines-client";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinesPage() {
  const ctx = await requireCompanyContext();

  const [contacts, users] = await Promise.all([
    prisma.contact.findMany({
      where: { companyId: ctx.company.id },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
      take: 500,
    }),
    prisma.membership.findMany({
      where: { companyId: ctx.company.id, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <PipelinesClient
      contacts={contacts}
      users={users.map((m) => m.user)}
      canCreate={ctx.can("pipelines", "create")}
      canEdit={ctx.can("pipelines", "edit")}
      canDelete={ctx.can("pipelines", "delete")}
    />
  );
}
