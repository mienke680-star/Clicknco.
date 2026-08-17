// Note: no "server-only" guard here — this module is also imported directly
// by prisma/seed.ts, a standalone Node script outside the Next.js server
// runtime, and that import guard throws unconditionally in a plain Node/tsx
// process. It's still never reachable from the browser: everything here only
// touches Prisma.
import { prisma } from "@/lib/db";
import { fullAccess, viewOnly, noAccess, type StaffPermissions } from "@/lib/permissions";
import type { WidgetType } from "@/generated/prisma/client";

export const BUILTIN_MODULES = [
  { key: "contacts", name: "Contacts", icon: "Users" },
  { key: "pipelines", name: "Pipeline", icon: "Kanban" },
  { key: "tasks", name: "Tasks", icon: "CheckSquare" },
  { key: "forms", name: "Forms", icon: "FileText" },
  { key: "emails", name: "Emails", icon: "Mail" },
  { key: "automations", name: "Automations", icon: "Workflow" },
  { key: "documents", name: "Documents", icon: "FolderOpen" },
  { key: "reports", name: "Reports", icon: "BarChart3" },
  { key: "users", name: "Users", icon: "UserCog" },
  { key: "settings", name: "Settings", icon: "Settings" },
] as const;

/** Every company gets these built-in modules at creation. Build Mode can hide (not delete) them. */
export async function provisionDefaultModules(companyId: string) {
  await prisma.companyModule.createMany({
    data: BUILTIN_MODULES.map((m, i) => ({
      companyId,
      key: m.key,
      name: m.name,
      icon: m.icon,
      kind: "BUILTIN" as const,
      active: true,
      sortOrder: i,
    })),
    skipDuplicates: true,
  });
}

export async function provisionDefaultDashboard(companyId: string) {
  const widgets: { type: WidgetType; title: string; position: { x: number; y: number; w: number; h: number }; sortOrder: number }[] = [
    { type: "TOTAL_LEADS", title: "Total Leads", position: { x: 0, y: 0, w: 3, h: 2 }, sortOrder: 0 },
    { type: "TASKS_DUE", title: "Tasks Due", position: { x: 3, y: 0, w: 3, h: 2 }, sortOrder: 1 },
    { type: "PIPELINE_VALUE", title: "Pipeline Value", position: { x: 6, y: 0, w: 3, h: 2 }, sortOrder: 2 },
    { type: "NEW_CLIENTS", title: "New Clients", position: { x: 9, y: 0, w: 3, h: 2 }, sortOrder: 3 },
    { type: "RECENT_ACTIVITY", title: "Recent Activity", position: { x: 0, y: 2, w: 6, h: 4 }, sortOrder: 4 },
    { type: "FORMS_RECEIVED", title: "Recent Form Submissions", position: { x: 6, y: 2, w: 6, h: 4 }, sortOrder: 5 },
  ];
  await prisma.dashboardWidget.createMany({ data: widgets.map((w) => ({ companyId, ...w })) });
}

function moduleAccess(overrides: Partial<Record<(typeof BUILTIN_MODULES)[number]["key"], Partial<Record<string, boolean>>>>) {
  const result: StaffPermissions = {};
  for (const m of BUILTIN_MODULES) {
    const base = overrides[m.key] ?? noAccess();
    result[m.key] = base as StaffPermissions[string];
  }
  return result;
}

/** Seeds two common example StaffRoles ("Sales" and "Viewer") so Build Mode has real starting data. */
export async function provisionDefaultStaffRoles(companyId: string) {
  await prisma.staffRole.createMany({
    data: [
      {
        companyId,
        name: "Sales",
        isDefault: true,
        permissions: moduleAccess({
          contacts: { ...fullAccess(), delete: false },
          pipelines: fullAccess(),
          tasks: fullAccess(),
          forms: viewOnly(),
          emails: { view: true, create: true },
          documents: { view: true, create: true },
          reports: viewOnly(),
        }),
      },
      {
        companyId,
        name: "Viewer",
        isDefault: false,
        permissions: moduleAccess({
          contacts: viewOnly(),
          pipelines: viewOnly(),
          tasks: viewOnly(),
          forms: viewOnly(),
          emails: viewOnly(),
          documents: viewOnly(),
          reports: viewOnly(),
        }),
      },
    ],
  });
}

export async function provisionDefaultPipeline(
  companyId: string,
  name = "Sales Pipeline",
  stageNames: string[] = ["New Lead", "Contacted", "Qualified", "Proposal", "Won", "Lost"],
) {
  return prisma.pipeline.create({
    data: {
      companyId,
      name,
      stages: {
        create: stageNames.map((n, i) => ({ name: n, order: i })),
      },
    },
    include: { stages: true },
  });
}

/** Full provisioning bundle used whenever a new company is created (seed script or Super Admin "Create Company"). */
export async function provisionNewCompany(companyId: string) {
  await provisionDefaultModules(companyId);
  await provisionDefaultDashboard(companyId);
  await provisionDefaultStaffRoles(companyId);
  await provisionDefaultPipeline(companyId);
}
