import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { BusinessDetailsClient } from "./business-client";

export const metadata: Metadata = { title: "Business details" };

export default async function BusinessDetailsPage() {
  const ctx = await requireCompanyContext();

  const settings = await prisma.businessSettings.upsert({
    where: { companyId: ctx.company.id },
    update: {},
    create: { companyId: ctx.company.id },
  });

  const canEdit = ctx.can("business_settings", "edit");

  return <BusinessDetailsClient settings={settings} canEdit={canEdit} />;
}
