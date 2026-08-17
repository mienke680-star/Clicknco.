import type { Metadata } from "next";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Settings" };

export default function PortalSettingsPage() {
  return (
    <div>
      <SectionHeading title="Settings" description="Your profile, notifications and security." />
      <ComingSoon title="Settings coming next" />
    </div>
  );
}
