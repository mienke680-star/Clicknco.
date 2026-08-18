import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { NewCompanyWizard } from "./new-company-client";

export const metadata: Metadata = { title: "Create Company" };

export default async function NewCompanyPage() {
  await requireSuperAdmin();
  return <NewCompanyWizard />;
}
