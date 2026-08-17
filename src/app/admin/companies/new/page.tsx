import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/misc";
import { ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Create Company" };

export default function NewCompanyPage() {
  return (
    <div>
      <SectionHeading title="Create Company" description="The setup wizard (details, branding, modules, users, dashboard, domain, launch) is next up." />
      <ComingSoon title="Setup wizard coming next" />
    </div>
  );
}
