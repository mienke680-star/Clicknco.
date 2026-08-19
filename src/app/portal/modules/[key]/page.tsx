import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { ModuleRecordsClient } from "./module-records-client";
import type { FieldDef } from "./field-input";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const module_ = await prisma.companyModule.findFirst({ where: { key }, select: { name: true } });
  return { title: module_?.name ?? key };
}

export default async function CustomModulePage({ params }: { params: Promise<{ key: string }> }) {
  const ctx = await requireCompanyContext();
  const { key } = await params;

  const module_ = await prisma.companyModule.findUnique({
    where: { companyId_key: { companyId: ctx.company.id, key } },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });
  if (!module_ || module_.kind !== "CUSTOM" || !ctx.can(module_.key, "view")) notFound();

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
    <ModuleRecordsClient
      moduleKey={module_.key}
      moduleName={module_.name}
      fields={module_.fields as unknown as FieldDef[]}
      users={users.map((m) => m.user)}
      contacts={contacts}
      canCreate={ctx.can(module_.key, "create")}
      canEdit={ctx.can(module_.key, "edit")}
      canDelete={ctx.can(module_.key, "delete")}
    />
  );
}
