import type { Metadata } from "next";
import Link from "next/link";
import { Blocks, LayoutDashboard, ShieldCheck, ArrowRight } from "lucide-react";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SectionHeading } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Build Mode" };

export default async function BuildModePage() {
  const ctx = await requireCompanyContext();
  if (!ctx.isSuperAdmin) redirect("/portal");

  const [moduleCount, activeModuleCount, widgetCount, staffRoleCount] = await Promise.all([
    prisma.companyModule.count({ where: { companyId: ctx.company.id } }),
    prisma.companyModule.count({ where: { companyId: ctx.company.id, active: true } }),
    prisma.dashboardWidget.count({ where: { companyId: ctx.company.id } }),
    prisma.staffRole.count({ where: { companyId: ctx.company.id } }),
  ]);

  const cards = [
    {
      href: "/portal/build/modules",
      icon: Blocks,
      title: "Modules & Navigation",
      description: "Toggle modules on or off, reorder the sidebar, and build custom modules with your own fields.",
      stat: `${activeModuleCount} of ${moduleCount} modules active`,
      live: true,
    },
    {
      href: "/portal/build/dashboard",
      icon: LayoutDashboard,
      title: "Dashboard Widgets",
      description: "Choose which widgets appear on this company's dashboard.",
      stat: `${widgetCount} widget${widgetCount === 1 ? "" : "s"} configured`,
      live: false,
    },
    {
      href: "/portal/build/permissions",
      icon: ShieldCheck,
      title: "Permissions",
      description: "Create staff roles and set exactly what each one can view, create, edit, or approve.",
      stat: `${staffRoleCount} staff role${staffRoleCount === 1 ? "" : "s"}`,
      live: false,
    },
  ];

  return (
    <div>
      <SectionHeading title="Build Mode" description={`Design ${ctx.company.name}'s system — this is the only place a client's setup ever changes.`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="block">
            <Card className="h-full p-5 transition-shadow hover:shadow-[var(--shadow-pop)]">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-peach text-coral-600">
                  <c.icon className="h-5 w-5" />
                </div>
                {!c.live && <Badge variant="outline">Coming soon</Badge>}
              </div>
              <p className="mt-4 flex items-center gap-1 text-base font-semibold text-navy-900">
                {c.title} <ArrowRight className="h-4 w-4 text-navy-300" />
              </p>
              <p className="mt-1 text-sm text-navy-400">{c.description}</p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-navy-300">{c.stat}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
