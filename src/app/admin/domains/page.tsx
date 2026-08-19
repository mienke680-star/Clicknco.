import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/misc";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { DomainsClient } from "./domains-client";

export const metadata: Metadata = { title: "Domains" };

export default async function AdminDomainsPage() {
  await requireSuperAdmin();

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <SectionHeading title="Domains" description="Every custom domain and subdomain connected across all companies." />
      <DomainsClient companies={companies} />
    </div>
  );
}
