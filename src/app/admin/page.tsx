import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { SectionHeading } from "@/components/ui/misc";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/table";
import { LinkButton } from "@/components/ui/button";
import { timeAgo, formatCurrency } from "@/lib/utils";
import { describeAuditAction } from "@/lib/audit-format";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalCompanies,
    activeCompanies,
    suspendedCompanies,
    trialCompanies,
    totalUsers,
    totalContacts,
    totalTasks,
    newCompaniesThisMonth,
    activeBilledCompanies,
    recentActivity,
    recentCompanies,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { status: "ACTIVE" } }),
    prisma.company.count({ where: { status: "SUSPENDED" } }),
    prisma.company.count({ where: { billingStatus: "TRIAL" } }),
    prisma.user.count(),
    prisma.contact.count(),
    prisma.task.count({ where: { status: { not: "COMPLETED" } } }),
    prisma.company.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.company.findMany({ where: { billingStatus: "ACTIVE" }, select: { monthlyFee: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: true, company: true } }),
    prisma.company.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const monthlyRevenue = activeBilledCompanies.reduce((sum, c) => sum + Number(c.monthlyFee ?? 0), 0);

  return (
    <div>
      <SectionHeading
        title="Platform Overview"
        description="Everything happening across Click & Co, at a glance."
        action={
          <LinkButton href="/admin/companies/new" size="md">
            Create Company
          </LinkButton>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total companies" value={totalCompanies} icon="Building2" />
        <StatCard label="Active companies" value={activeCompanies} icon="CheckCircle2" accent="aqua" />
        <StatCard label="Trials" value={trialCompanies} icon="Hourglass" />
        <StatCard label="Suspended" value={suspendedCompanies} icon="CircleSlash" accent="coral" />
        <StatCard label="Total users" value={totalUsers} icon="Users" />
        <StatCard label="Total contacts" value={totalContacts} icon="Contact" />
        <StatCard label="Open tasks" value={totalTasks} icon="SquareCheckBig" />
        <StatCard label="New this month" value={newCompaniesThisMonth} icon="Sparkles" />
      </div>

      <div className="mt-4">
        <StatCard label="Monthly recurring revenue" value={formatCurrency(monthlyRevenue)} icon="CreditCard" accent="aqua" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent companies</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCompanies.length === 0 ? (
              <EmptyState title="No companies yet" description="Create your first company to get started." />
            ) : (
              <ul className="divide-y divide-navy-50">
                {recentCompanies.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-3">
                    <Avatar name={c.name} src={c.logoUrl} size={32} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/companies/${c.id}`} className="truncate text-sm font-medium text-navy-900 hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-xs text-navy-400">{c.industry || "No industry set"}</p>
                    </div>
                    <Badge variant={c.status === "ACTIVE" ? "success" : c.status === "SUSPENDED" ? "danger" : "neutral"}>
                      {c.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <EmptyState title="Nothing logged yet" />
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((log) => (
                  <li key={log.id} className="flex items-start gap-3 text-sm">
                    <Avatar name={log.actor?.name ?? "System"} size={28} />
                    <div className="min-w-0">
                      <p className="text-navy-700">
                        <span className="font-medium text-navy-900">{log.actor?.name ?? "System"}</span>{" "}
                        {describeAuditAction(log.action)}
                        {log.company && <span className="text-navy-400"> in {log.company.name}</span>}
                      </p>
                      <p className="text-xs text-navy-300">{timeAgo(log.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
