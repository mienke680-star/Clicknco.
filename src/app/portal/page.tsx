import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { SectionHeading } from "@/components/ui/misc";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { timeAgo, formatCurrency } from "@/lib/utils";
import { describeAuditAction } from "@/lib/audit-format";
import type { WidgetType } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Dashboard" };

const WIDGET_ICON: Record<string, string> = {
  TOTAL_LEADS: "Users",
  SALES: "TrendingUp",
  TASKS_DUE: "SquareCheckBig",
  REVENUE: "CreditCard",
  PIPELINE_VALUE: "Kanban",
  NEW_CLIENTS: "UserPlus",
  FORMS_RECEIVED: "FileText",
  UPCOMING_APPOINTMENTS: "Calendar",
};

async function computeStat(companyId: string, type: WidgetType): Promise<string | number | null> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  switch (type) {
    case "TOTAL_LEADS":
      return prisma.contact.count({ where: { companyId } });
    case "TASKS_DUE":
      return prisma.task.count({ where: { companyId, status: { not: "COMPLETED" } } });
    case "PIPELINE_VALUE": {
      const cards = await prisma.pipelineCard.findMany({ where: { companyId, status: "OPEN" }, select: { value: true } });
      return formatCurrency(cards.reduce((s, c) => s + Number(c.value ?? 0), 0));
    }
    case "NEW_CLIENTS":
      return prisma.contact.count({ where: { companyId, createdAt: { gte: startOfMonth } } });
    default:
      return null;
  }
}

export default async function PortalDashboardPage() {
  const ctx = await requireCompanyContext();
  const companyId = ctx.company.id;

  const widgets = await prisma.dashboardWidget.findMany({ where: { companyId }, orderBy: { sortOrder: "asc" } });
  const statWidgets = widgets.filter((w) =>
    ["TOTAL_LEADS", "SALES", "TASKS_DUE", "REVENUE", "PIPELINE_VALUE", "NEW_CLIENTS", "CUSTOM_NUMBER"].includes(w.type),
  );
  const listWidgets = widgets.filter((w) => ["RECENT_ACTIVITY", "FORMS_RECEIVED", "UPCOMING_APPOINTMENTS", "CUSTOM_LIST"].includes(w.type));

  const stats = await Promise.all(statWidgets.map((w) => computeStat(companyId, w.type)));

  const [recentActivity, recentSubmissions] = await Promise.all([
    prisma.auditLog.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 6, include: { actor: true } }),
    prisma.formSubmission.findMany({ where: { form: { companyId } }, orderBy: { createdAt: "desc" }, take: 6, include: { form: true, contact: true } }),
  ]);

  return (
    <div>
      <SectionHeading title={`Welcome back, ${ctx.user.name.split(" ")[0]}`} description={`Here's what's happening at ${ctx.company.name}.`} />

      {widgets.length === 0 ? (
        <EmptyState
          title="Dashboard not configured yet"
          description="Super Admin can add widgets to this dashboard from Build Mode."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {statWidgets.map((w, i) => (
              <StatCard key={w.id} label={w.title} value={stats[i] ?? "—"} icon={WIDGET_ICON[w.type] ?? "Gauge"} />
            ))}
          </div>

          {listWidgets.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {listWidgets.map((w) => (
                <Card key={w.id}>
                  <CardHeader>
                    <CardTitle>{w.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {w.type === "RECENT_ACTIVITY" ? (
                      recentActivity.length === 0 ? (
                        <EmptyState title="No activity yet" />
                      ) : (
                        <ul className="space-y-3">
                          {recentActivity.map((log) => (
                            <li key={log.id} className="flex items-start gap-3 text-sm">
                              <Avatar name={log.actor?.name ?? "System"} size={28} />
                              <div className="min-w-0">
                                <p className="text-navy-700">
                                  <span className="font-medium text-navy-900">{log.actor?.name ?? "System"}</span>{" "}
                                  {describeAuditAction(log.action)}
                                </p>
                                <p className="text-xs text-navy-300">{timeAgo(log.createdAt)}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : w.type === "FORMS_RECEIVED" ? (
                      recentSubmissions.length === 0 ? (
                        <EmptyState title="No form submissions yet" description="Submissions will appear here as forms are filled in." />
                      ) : (
                        <ul className="divide-y divide-navy-50">
                          {recentSubmissions.map((s) => (
                            <li key={s.id} className="py-2.5 text-sm">
                              <p className="font-medium text-navy-900">{s.form.name}</p>
                              <p className="text-xs text-navy-400">
                                {s.contact ? `${s.contact.firstName} ${s.contact.lastName ?? ""}` : "Unlinked submission"} · {timeAgo(s.createdAt)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : (
                      <EmptyState title="Not configured yet" description="This widget type is set up from Build Mode." />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
