"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowLeft } from "lucide-react";
import { SidebarNav } from "./sidebar";
import { GlobalSearch } from "./global-search";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";
import type { NavItem } from "./nav-types";
import { cn } from "@/lib/utils";

export interface DashboardShellProps {
  navItems: NavItem[];
  brandName: string;
  brandLogoUrl?: string | null;
  homeHref: string;
  userName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
  isSuperAdmin?: boolean;
  settingsHref?: string;
  topbarExtra?: React.ReactNode;
  impersonating?: { label: string; exitHref: string } | null;
  showNotifications?: boolean;
  children: React.ReactNode;
}

export function DashboardShell({
  navItems,
  brandName,
  brandLogoUrl,
  homeHref,
  userName,
  userEmail,
  userAvatarUrl,
  isSuperAdmin,
  settingsHref,
  topbarExtra,
  impersonating,
  showNotifications = true,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const brandBlock = (
    <Link href={homeHref} className="flex items-center gap-2 px-4 py-4">
      {brandLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brandLogoUrl} alt={brandName} className="h-7 w-7 rounded-lg object-cover" />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-coral-500 text-xs font-bold text-white">
          {brandName.slice(0, 1).toUpperCase()}
        </div>
      )}
      <span className="truncate text-sm font-semibold text-white">{brandName}</span>
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-navy-900 lg:flex">
        {brandBlock}
        <SidebarNav items={navItems} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex w-72 flex-col bg-navy-900">
            <div className="flex items-center justify-between pr-2">
              {brandBlock}
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-navy-300 hover:bg-white/10 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav items={navItems} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {impersonating && (
          <div className="flex items-center justify-center gap-2 bg-navy-900 px-4 py-2 text-center text-xs font-medium text-white">
            <span>{impersonating.label}</span>
            <Link href={impersonating.exitHref} className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 hover:bg-white/25">
              <ArrowLeft className="h-3 w-3" /> Back to control centre
            </Link>
          </div>
        )}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-navy-100 bg-white/90 px-4 py-3 backdrop-blur">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-navy-500 hover:bg-navy-50 lg:hidden cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden flex-1 sm:block">
            <GlobalSearch />
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
            {topbarExtra}
            {showNotifications && <NotificationsBell />}
            <UserMenu
              name={userName}
              email={userEmail}
              avatarUrl={userAvatarUrl}
              settingsHref={settingsHref}
              isSuperAdmin={isSuperAdmin}
            />
          </div>
        </header>
        <div className="border-b border-navy-100 bg-white px-4 py-2 sm:hidden">
          <GlobalSearch />
        </div>
        <main className={cn("flex-1 px-4 py-6 sm:px-6 lg:px-8")}>{children}</main>
      </div>
    </div>
  );
}
