import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { SectionHeading } from "@/components/ui/misc";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import { Input, Label, Select } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

const TASK_STATUS_LABEL: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  WAITING: "Waiting",
  COMPLETED: "Completed",
};
const TASK_STATUS_ORDER = ["TODO", "IN_PROGRESS", "WAITING", "COMPLETED"];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

function rangeHref(days: number, userId: string | null) {
  const to = startOfDay(new Date());
  const from = addDays(to, -(days - 1));
  const params = new URLSearchParams({ from: toDateInput(from), to: toDateInput(to) });
  if (userId) params.set("userId", userId);
  return `/portal/reports?${params.toString()}`;
}

/** Plain HTML/CSS bar mark: thin track, rounded coral fill, direct value label -- no charting library. */
function BarRow({ label, value, max, displayValue }: { label: string; value: number; max: number; displayValue: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div className="flex items-center gap-3" title={`${label}: ${displayValue}`}>
      <p className="w-24 shrink-0 truncate text-xs text-navy-500 sm:w-32">{label}</p>
      <div className="h-2 flex-1 rounded-full bg-navy-50">
        <div className="h-2 rounded-full bg-coral-500 transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <p className="w-20 shrink-0 text-right text-xs font-medium text-navy-700">{displayValue}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; userId?: string }>;
}) {
  const ctx = await requireCompanyContext();
  const sp = await searchParams;
  const companyId = ctx.company.id;

  const today = startOfDay(new Date());
  const from = sp.from && !isNaN(Date.parse(sp.from)) ? startOfDay(new Date(sp.from)) : addDays(today, -29);
  const to = sp.to && !isNaN(Date.parse(sp.to)) ? endOfDay(new Date(sp.to)) : endOfDay(today);
  const userId = sp.userId && sp.userId !== "all" ? sp.userId : null;
  const dateRange = { gte: from, lte: to };
  const userFilter = userId ? { assignedUserId: userId } : {};

  const [members, contacts, openCards, stages, tasks, tasksCompleted, formSubmissionCount] = await Promise.all([
    prisma.membership.findMany({
      where: { companyId, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.contact.findMany({
      where: { companyId, createdAt: dateRange, ...userFilter },
      select: { id: true, createdAt: true },
    }),
    prisma.pipelineCard.findMany({
      where: { companyId, status: "OPEN", createdAt: dateRange, ...userFilter },
      select: { value: true, stageId: true },
    }),
    prisma.pipelineStage.findMany({
      where: { pipeline: { companyId } },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: { companyId, createdAt: dateRange, ...userFilter },
      select: { id: true, status: true },
    }),
    prisma.task.count({ where: { companyId, status: "COMPLETED", updatedAt: dateRange, ...userFilter } }),
    prisma.formSubmission.count({ where: { form: { companyId }, createdAt: dateRange } }),
  ]);

  // ---- KPIs ----
  const pipelineValue = openCards.reduce((sum, c) => sum + Number(c.value ?? 0), 0);

  // ---- Leads Over Time ----
  const totalDays = daysBetween(from, to) + 1;
  const granularity: "day" | "week" = totalDays <= 31 ? "day" : "week";
  const bucketCount = granularity === "day" ? totalDays : Math.ceil(totalDays / 7);
  const leadBuckets = Array.from({ length: bucketCount }, (_, i) => {
    const start = addDays(from, granularity === "day" ? i : i * 7);
    return { label: formatDate(start, { month: "short", day: "numeric" }), count: 0 };
  });
  for (const c of contacts) {
    const diffDays = daysBetween(from, c.createdAt);
    const idx = Math.min(granularity === "day" ? diffDays : Math.floor(diffDays / 7), leadBuckets.length - 1);
    if (leadBuckets[idx]) leadBuckets[idx].count += 1;
  }
  const leadsMax = Math.max(...leadBuckets.map((b) => b.count), 1);

  // ---- Pipeline Value by Stage ----
  const valueByStage = new Map<string, number>();
  for (const card of openCards) {
    if (!card.stageId) continue;
    valueByStage.set(card.stageId, (valueByStage.get(card.stageId) ?? 0) + Number(card.value ?? 0));
  }
  const stageMax = Math.max(...stages.map((s) => valueByStage.get(s.id) ?? 0), 1);

  // ---- Task Status Breakdown ----
  const countByStatus = new Map<string, number>();
  for (const t of tasks) countByStatus.set(t.status, (countByStatus.get(t.status) ?? 0) + 1);
  const statusMax = Math.max(...TASK_STATUS_ORDER.map((s) => countByStatus.get(s) ?? 0), 1);

  return (
    <div>
      <SectionHeading title="Reports" description="Leads, pipeline, tasks and form activity -- filterable by date range and team member." />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-navy-100 bg-white p-4">
        <div>
          <Label>From</Label>
          <Input type="date" name="from" defaultValue={toDateInput(from)} className="w-40" />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" name="to" defaultValue={toDateInput(to)} className="w-40" />
        </div>
        <div>
          <Label>Team member</Label>
          <Select name="userId" defaultValue={userId ?? "all"} className="w-48">
            <option value="all">Everyone</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit">Apply</Button>
        {/* Plain <a> tags (not next/link) -- this page is fully server-rendered around
            search params, same as the filter form's native GET submit just above, and a
            same-pathname / new-search-params client transition isn't reliably picked up. */}
        <div className="ml-auto flex flex-wrap gap-2">
          <a href={rangeHref(7, userId)} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Last 7 days
          </a>
          <a href={rangeHref(30, userId)} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Last 30 days
          </a>
          <a href={rangeHref(90, userId)} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Last 90 days
          </a>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="New Leads" value={formatNumber(contacts.length)} icon="Users" accent="coral" />
        <StatCard label="Pipeline Value" value={formatCurrency(pipelineValue)} icon="Kanban" accent="navy" />
        <StatCard label="Tasks Completed" value={formatNumber(tasksCompleted)} icon="SquareCheckBig" accent="aqua" />
        <StatCard label="Form Submissions" value={formatNumber(formSubmissionCount)} icon="FileText" accent="coral" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title={`Leads Over Time (by ${granularity})`}>
          {contacts.length === 0 ? (
            <EmptyState title="No leads in this range" description="New contacts created in the selected window will show up here." />
          ) : (
            leadBuckets.map((b, i) => <BarRow key={i} label={b.label} value={b.count} max={leadsMax} displayValue={formatNumber(b.count)} />)
          )}
        </ChartCard>

        <ChartCard title="Pipeline Value by Stage">
          {stages.length === 0 ? (
            <EmptyState title="No pipeline set up yet" description="Create a pipeline to see open deal value by stage." />
          ) : (
            stages.map((s) => (
              <BarRow key={s.id} label={s.name} value={valueByStage.get(s.id) ?? 0} max={stageMax} displayValue={formatCurrency(valueByStage.get(s.id) ?? 0)} />
            ))
          )}
        </ChartCard>

        <ChartCard title="Task Status Breakdown">
          {tasks.length === 0 ? (
            <EmptyState title="No tasks in this range" description="Tasks created in the selected window will show up here." />
          ) : (
            TASK_STATUS_ORDER.map((s) => (
              <BarRow key={s} label={TASK_STATUS_LABEL[s]} value={countByStatus.get(s) ?? 0} max={statusMax} displayValue={formatNumber(countByStatus.get(s) ?? 0)} />
            ))
          )}
        </ChartCard>
      </div>
    </div>
  );
}
