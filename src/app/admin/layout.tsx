import { requireSuperAdmin } from "@/lib/auth/rbac";
import { DashboardShell } from "@/components/dashboard/shell";
import type { NavItem } from "@/components/dashboard/nav-types";

const ADMIN_NAV: NavItem[] = [
  { key: "overview", label: "Overview", href: "/admin", icon: "LayoutDashboard" },
  { key: "companies", label: "Companies", href: "/admin/companies", icon: "Building2" },
  { key: "systems", label: "Company Systems", href: "/admin/systems", icon: "Blocks" },
  { key: "inquiries", label: "Inquiries", href: "/admin/inquiries", icon: "Inbox" },
  { key: "domains", label: "Domains", href: "/admin/domains", icon: "Globe" },
  { key: "integrations", label: "Integrations", href: "/admin/integrations", icon: "Plug" },
  { key: "billing", label: "Billing", href: "/admin/billing", icon: "CreditCard" },
  { key: "activity", label: "Activity Log", href: "/admin/activity", icon: "History" },
  { key: "settings", label: "Platform Settings", href: "/admin/settings", icon: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSuperAdmin();

  return (
    <DashboardShell
      navItems={ADMIN_NAV}
      brandName="Click & Co"
      homeHref="/admin"
      userName={session.user.name}
      userEmail={session.user.email}
      userAvatarUrl={session.user.avatarUrl}
      isSuperAdmin
      settingsHref="/admin/settings"
      showNotifications={false}
    >
      {children}
    </DashboardShell>
  );
}
