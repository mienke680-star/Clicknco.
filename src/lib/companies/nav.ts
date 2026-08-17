import type { NavItem } from "@/components/dashboard/nav-types";
import type { CompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";

const BUILTIN_HREF: Record<string, string> = {
  contacts: "/portal/contacts",
  pipelines: "/portal/pipelines",
  tasks: "/portal/tasks",
  forms: "/portal/forms",
  emails: "/portal/emails",
  automations: "/portal/automations",
  documents: "/portal/documents",
  reports: "/portal/reports",
  users: "/portal/users",
  settings: "/portal/settings",
};

export async function buildPortalNavItems(ctx: CompanyContext & { company: NonNullable<CompanyContext["company"]> }): Promise<NavItem[]> {
  const modules = await prisma.companyModule.findMany({
    where: { companyId: ctx.company.id, active: true },
    orderBy: { sortOrder: "asc" },
  });

  const items: NavItem[] = [{ key: "dashboard", label: "Dashboard", href: "/portal", icon: "LayoutDashboard" }];

  for (const m of modules) {
    if (!ctx.can(m.key, "view")) continue;
    const href = m.kind === "BUILTIN" ? (BUILTIN_HREF[m.key] ?? `/portal/modules/${m.key}`) : `/portal/modules/${m.key}`;
    items.push({ key: m.key, label: m.name, href, icon: m.icon, group: m.group ?? undefined });
  }

  if (ctx.isSuperAdmin) {
    items.push({ key: "build", label: "Build Mode", href: "/portal/build", icon: "Hammer", group: "Super Admin" });
  }

  return items;
}
