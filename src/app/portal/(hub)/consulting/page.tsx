import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { getRecurringServices, getDesignBriefs } from "@/lib/clickco/consulting";
import { ConsultingClient } from "./consulting-client";

export const metadata: Metadata = { title: "Social consulting" };

export default async function ConsultingPage() {
  const ctx = await requireCompanyContext();
  const companyId = ctx.company.id;

  const [services, briefs, contacts] = await Promise.all([
    getRecurringServices(companyId),
    getDesignBriefs(companyId),
    prisma.contact.findMany({
      where: { companyId },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <ConsultingClient
      services={services}
      briefs={briefs}
      contacts={contacts}
      canCreate={ctx.can("consulting", "create")}
      canEdit={ctx.can("consulting", "edit")}
    />
  );
}
