import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Permissions" };

export default async function BuildPermissionsPage() {
  const ctx = await requireCompanyContext();
  if (!ctx.isSuperAdmin) redirect("/portal");

  const staffRoles = await prisma.staffRole.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { memberships: true } } },
  });

  return (
    <div>
      <SectionHeading title="Permissions" description={`Staff roles control exactly what each person can do inside ${ctx.company.name}.`} />
      {staffRoles.length > 0 && (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap gap-2">
            {staffRoles.map((r) => (
              <Badge key={r.id} variant="neutral">
                {r.name} · {r._count.memberships} member{r._count.memberships === 1 ? "" : "s"}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
      <ComingSoon
        title="Permission matrix editor coming next"
        description="These roles already work end to end — assign them to a member from the company's Team tab and every module respects their view/create/edit/delete/export/assign/approve/settings permissions. Creating new roles and editing the matrix from here is next up."
      />
    </div>
  );
}
