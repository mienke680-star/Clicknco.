import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { getClientList } from "@/lib/clickco/clients";
import { getPackages, getAddons } from "@/lib/clickco/packages";
import { ContactsClient } from "./contacts-client";

export const metadata: Metadata = { title: "Clients" };

export default async function ContactsPage() {
  const ctx = await requireCompanyContext();
  const companyId = ctx.company.id;

  const [clients, tags, users, packages, addons, businessSettings] = await Promise.all([
    getClientList(companyId),
    prisma.tag.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.membership.findMany({
      where: { companyId, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true } } },
    }),
    getPackages(companyId),
    getAddons(companyId),
    prisma.businessSettings.upsert({ where: { companyId }, update: {}, create: { companyId } }),
  ]);

  return (
    <ContactsClient
      clients={clients}
      tags={tags}
      users={users.map((m) => m.user)}
      packages={packages}
      addons={addons}
      vatTreatment={businessSettings.vatTreatment}
      nextQuoteNumber={businessSettings.nextQuoteNumber}
      businessSettings={{
        ownerName: businessSettings.ownerName,
        tradingName: businessSettings.tradingName,
        registrationNumber: businessSettings.registrationNumber,
        email: businessSettings.email,
        phone: businessSettings.phone,
      }}
      canCreate={ctx.can("contacts", "create")}
      canEdit={ctx.can("contacts", "edit")}
      canDelete={ctx.can("contacts", "delete")}
      canExport={ctx.can("contacts", "export")}
      canCreateQuote={ctx.can("quotes", "create")}
    />
  );
}
