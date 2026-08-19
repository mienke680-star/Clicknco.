import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { TasksClient } from "./tasks-client";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const ctx = await requireCompanyContext();

  const [users, contacts] = await Promise.all([
    prisma.membership.findMany({
      where: { companyId: ctx.company.id, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.contact.findMany({
      where: { companyId: ctx.company.id },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
      take: 500,
    }),
  ]);

  return (
    <TasksClient
      users={users.map((m) => m.user)}
      contacts={contacts}
      canCreate={ctx.can("tasks", "create")}
      canEdit={ctx.can("tasks", "edit")}
      canDelete={ctx.can("tasks", "delete")}
    />
  );
}
