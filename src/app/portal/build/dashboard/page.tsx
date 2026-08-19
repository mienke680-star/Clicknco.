import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Dashboard Widgets" };

export default async function BuildDashboardPage() {
  const ctx = await requireCompanyContext();
  if (!ctx.isSuperAdmin) redirect("/portal");

  return (
    <div>
      <SectionHeading title="Dashboard Widgets" description={`Choose what appears on ${ctx.company.name}'s dashboard.`} />
      <ComingSoon
        title="Dashboard builder coming next"
        description="Every company already gets a real, working default dashboard (Total Leads, Tasks Due, Pipeline Value, Recent Activity, and more) — adding, removing, and reordering widgets from here is next up."
      />
    </div>
  );
}
