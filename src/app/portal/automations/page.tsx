import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { AutomationsClient } from "./automations-client";

export const metadata: Metadata = { title: "Automations" };

export default async function AutomationsPage() {
  const ctx = await requireCompanyContext();
  return <AutomationsClient canCreate={ctx.can("automations", "create")} canDelete={ctx.can("automations", "delete")} />;
}
