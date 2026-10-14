import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { getNeedsYou, getTodayStats, getTodaySchedule, getActiveDelivery, getRecentActivity } from "@/lib/clickco/today";
import { TodayClient } from "./today-client";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const ctx = await requireCompanyContext();
  const companyId = ctx.company.id;

  const [needsYou, stats, schedule, activeDelivery, activity, contacts, businessSettings] = await Promise.all([
    getNeedsYou(companyId, ctx.can),
    getTodayStats(companyId),
    getTodaySchedule(companyId),
    getActiveDelivery(companyId),
    getRecentActivity(companyId),
    prisma.contact.findMany({ where: { companyId }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } }),
    prisma.businessSettings.upsert({ where: { companyId }, update: {}, create: { companyId } }),
  ]);

  const setupMissing = !businessSettings.bankName || businessSettings.vatTreatment === "UNSET";

  return (
    <TodayClient
      firstName={ctx.user.name.split(" ")[0] ?? ctx.user.name}
      needsYou={needsYou}
      stats={stats}
      schedule={schedule}
      activeDelivery={activeDelivery}
      activity={activity}
      contacts={contacts}
      setupMissing={setupMissing}
      canEditCalendar={ctx.can("calendar", "edit")}
      canCreateCalendar={ctx.can("calendar", "create")}
      canViewInvoices={ctx.can("invoices", "view")}
      canViewQuotes={ctx.can("quotes", "view")}
      canViewProjects={ctx.can("projects", "view")}
      canViewBusinessSettings={ctx.can("business_settings", "view")}
    />
  );
}
