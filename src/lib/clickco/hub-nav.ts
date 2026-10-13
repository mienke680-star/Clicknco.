import {
  IconLayoutDashboard,
  IconCalendar,
  IconUsers,
  IconLayoutKanban,
  IconMessageCircle,
  IconFileText,
  IconReceipt,
  IconPackage,
  IconSettings,
  type Icon,
} from "@tabler/icons-react";
import type { CompanyContext } from "@/lib/auth/rbac";

export interface HubNavItem {
  key: string;
  label: string;
  href: string;
  icon: Icon;
  /** Shown in the phone bottom tab bar; everything else lives behind "More". */
  tab?: boolean;
  /** Permission module key gating this item. Omit for items everyone sees (Today). */
  module?: string;
}

export const HUB_NAV: HubNavItem[] = [
  { key: "today", label: "Today", href: "/portal", icon: IconLayoutDashboard, tab: true },
  { key: "calendar", label: "Calendar", href: "/portal/calendar", icon: IconCalendar, tab: true, module: "calendar" },
  { key: "clients", label: "Clients", href: "/portal/contacts", icon: IconUsers, tab: true, module: "contacts" },
  { key: "projects", label: "Projects", href: "/portal/projects", icon: IconLayoutKanban, module: "projects" },
  { key: "consulting", label: "Social consulting", href: "/portal/consulting", icon: IconMessageCircle, module: "consulting" },
  { key: "quotes", label: "Quotes", href: "/portal/quotes", icon: IconFileText, module: "quotes" },
  { key: "invoices", label: "Invoices", href: "/portal/invoices", icon: IconReceipt, tab: true, module: "invoices" },
  { key: "packages", label: "Services and packages", href: "/portal/packages", icon: IconPackage, module: "packages" },
  { key: "business", label: "Business details", href: "/portal/business", icon: IconSettings, module: "business_settings" },
];

/** Plain string keys only -- safe to pass from a server component into a
 * client component. HubShell (client) re-filters the full HUB_NAV array
 * (which holds icon component references) against this set itself, since a
 * component reference can't cross the server/client boundary as a prop. */
export function getVisibleHubNavKeys(ctx: CompanyContext): string[] {
  return HUB_NAV.filter((item) => !item.module || ctx.can(item.module, "view")).map((item) => item.key);
}
