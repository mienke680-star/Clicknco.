import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/misc";
import { ComingSoon } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Companies" };

export default function CompaniesPage() {
  return (
    <div>
      <SectionHeading
        title="Companies"
        description="Create and manage every company system you run on Click & Co."
        action={<LinkButton href="/admin/companies/new">Create Company</LinkButton>}
      />
      <ComingSoon title="Companies list is being built" description="Company CRUD, the setup wizard, and Enter Company are next up." />
    </div>
  );
}
