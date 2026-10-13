import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { getQuotes } from "@/lib/clickco/quotes";
import { getPackages, getAddons } from "@/lib/clickco/packages";
import { QuotesClient } from "./quotes-client";

export const metadata: Metadata = { title: "Quotes" };

export default async function QuotesPage() {
  const ctx = await requireCompanyContext();
  const companyId = ctx.company.id;

  const [quotes, packages, addons, contacts, businessSettings] = await Promise.all([
    getQuotes(companyId),
    getPackages(companyId),
    getAddons(companyId),
    prisma.contact.findMany({
      where: { companyId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.businessSettings.upsert({ where: { companyId }, update: {}, create: { companyId } }),
  ]);

  return (
    <QuotesClient
      quotes={quotes}
      packages={packages}
      addons={addons}
      contacts={contacts}
      vatTreatment={businessSettings.vatTreatment}
      nextQuoteNumber={businessSettings.nextQuoteNumber}
      businessSettings={{
        ownerName: businessSettings.ownerName,
        tradingName: businessSettings.tradingName,
        registrationNumber: businessSettings.registrationNumber,
        email: businessSettings.email,
        phone: businessSettings.phone,
      }}
      canCreate={ctx.can("quotes", "create")}
    />
  );
}
