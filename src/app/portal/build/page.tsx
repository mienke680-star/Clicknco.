import type { Metadata } from "next";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Build Mode" };

export default async function BuildModePage() {
  const ctx = await requireCompanyContext();
  if (!ctx.isSuperAdmin) redirect("/portal");

  return (
    <div>
      <SectionHeading title="Build Mode" description={`Design ${ctx.company.name}'s system: modules, fields, dashboard and navigation.`} />
      <ComingSoon title="Build Mode coming next" description="Module toggles, the custom module/field builder, dashboard builder and sidebar builder land here." />
    </div>
  );
}
