import type { Metadata } from "next";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Users" };

export default function PortalUsersPage() {
  return (
    <div>
      <SectionHeading title="Users" description="Manage your team and their access." />
      <ComingSoon title="Team management coming next" />
    </div>
  );
}
