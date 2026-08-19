import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AutomationDetailClient } from "./automation-detail-client";

export default async function AutomationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCompanyContext();

  const [templates, memberships] = await Promise.all([
    prisma.emailTemplate.findMany({ where: { companyId: ctx.company.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.membership.findMany({ where: { companyId: ctx.company.id, status: "ACTIVE" }, include: { user: { select: { id: true, name: true } } } }),
  ]);

  return (
    <AutomationDetailClient
      workflowId={id}
      templates={templates}
      users={memberships.map((m) => m.user)}
      canEdit={ctx.can("automations", "edit")}
    />
  );
}
