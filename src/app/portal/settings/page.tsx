import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Settings" };

export default async function PortalSettingsPage() {
  const ctx = await requireCompanyContext();

  return (
    <SettingsClient
      name={ctx.user.name}
      email={ctx.user.email}
      twoFactorEnabled={ctx.user.twoFactorEnabled}
      twoFactorMethod={ctx.user.twoFactorMethod}
    />
  );
}
