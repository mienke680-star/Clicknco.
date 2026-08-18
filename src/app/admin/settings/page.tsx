import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/misc";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Platform Settings" };

export default async function AdminSettingsPage() {
  await requireSuperAdmin();

  return (
    <div>
      <SectionHeading title="Platform Settings" description="Everything on the public Click & Co site — edit here, it's live immediately." />
      <SettingsClient />
    </div>
  );
}
