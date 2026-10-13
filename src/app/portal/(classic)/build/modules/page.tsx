import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { ModulesClient } from "./modules-client";

export const metadata: Metadata = { title: "Modules & Navigation" };

export default async function BuildModulesPage() {
  const ctx = await requireCompanyContext();
  if (!ctx.isSuperAdmin) redirect("/portal");

  return <ModulesClient companyName={ctx.company.name} />;
}
