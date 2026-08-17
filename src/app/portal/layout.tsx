import { requireCompanyContext } from "@/lib/auth/rbac";
import { buildPortalNavItems } from "@/lib/companies/nav";
import { DashboardShell } from "@/components/dashboard/shell";
import { CompanySwitcher } from "@/components/dashboard/company-switcher";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCompanyContext();
  const navItems = await buildPortalNavItems(ctx);

  return (
    <DashboardShell
      navItems={navItems}
      brandName={ctx.company.portalName || ctx.company.name}
      brandLogoUrl={ctx.company.logoUrl}
      homeHref="/portal"
      userName={ctx.user.name}
      userEmail={ctx.user.email}
      userAvatarUrl={ctx.user.avatarUrl}
      isSuperAdmin={ctx.isSuperAdmin}
      settingsHref="/portal/settings"
      topbarExtra={<CompanySwitcher activeCompanyId={ctx.company.id} activeCompanyName={ctx.company.name} />}
      impersonating={
        ctx.isSuperAdmin ? { label: `Viewing ${ctx.company.name} as Super Admin`, exitHref: "/admin" } : null
      }
    >
      {children}
    </DashboardShell>
  );
}
