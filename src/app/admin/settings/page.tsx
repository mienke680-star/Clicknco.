import type { Metadata } from "next";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Platform Settings" };

export default function AdminSettingsPage() {
  return (
    <div>
      <SectionHeading title="Platform Settings" description="Site Manager (public site content), your profile and platform-wide security settings." />
      <ComingSoon title="Platform settings coming next" />
    </div>
  );
}
