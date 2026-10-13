import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { getInvoices } from "@/lib/clickco/invoices";
import { InvoicesClient } from "./invoices-client";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const ctx = await requireCompanyContext();
  const companyId = ctx.company.id;

  const [invoices, contacts, businessSettings] = await Promise.all([
    getInvoices(companyId),
    prisma.contact.findMany({
      where: { companyId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.businessSettings.upsert({ where: { companyId }, update: {}, create: { companyId } }),
  ]);

  return (
    <InvoicesClient
      invoices={invoices}
      contacts={contacts}
      businessSettings={{
        ownerName: businessSettings.ownerName,
        tradingName: businessSettings.tradingName,
        registrationNumber: businessSettings.registrationNumber,
        email: businessSettings.email,
        phone: businessSettings.phone,
        bankName: businessSettings.bankName,
        accountNumber: businessSettings.accountNumber,
        branchCode: businessSettings.branchCode,
      }}
      canCreate={ctx.can("invoices", "create")}
      canEdit={ctx.can("invoices", "edit")}
    />
  );
}
