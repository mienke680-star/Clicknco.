import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  return { title: key };
}

export default async function CustomModulePage({ params }: { params: Promise<{ key: string }> }) {
  const ctx = await requireCompanyContext();
  const { key } = await params;

  const module_ = await prisma.companyModule.findUnique({
    where: { companyId_key: { companyId: ctx.company.id, key } },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });
  if (!module_ || !ctx.can(module_.key, "view")) notFound();

  return (
    <div>
      <SectionHeading title={module_.name} description={`${module_.fields.length} field${module_.fields.length === 1 ? "" : "s"} configured.`} />
      <ComingSoon title="Module records view coming next" description="The record list, detail view and inline editor for custom modules land here." />
    </div>
  );
}
