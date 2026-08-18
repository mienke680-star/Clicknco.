import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { CompanyDetailClient } from "./company-detail-client";

export const metadata: Metadata = { title: "Company" };

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  return <CompanyDetailClient companyId={id} />;
}
