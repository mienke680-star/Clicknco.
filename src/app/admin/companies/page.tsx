import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { CompaniesClient } from "./companies-client";

export const metadata: Metadata = { title: "Companies" };

export default async function CompaniesPage() {
  await requireSuperAdmin();
  return <CompaniesClient />;
}
