"use client";

import { useState } from "react";
import { LogOut, Settings, ShieldCheck } from "lucide-react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/avatar";
import { apiPost, hardNavigate } from "@/lib/api-client";

export function UserMenu({
  name,
  email,
  avatarUrl,
  settingsHref,
  isSuperAdmin,
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  settingsHref?: string;
  isSuperAdmin?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await apiPost("/api/auth/logout").catch(() => {});
    hardNavigate("/login");
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <div className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-navy-50 cursor-pointer">
          <Avatar name={name} src={avatarUrl} size={30} />
          {isSuperAdmin && (
            <ShieldCheck className="hidden h-3.5 w-3.5 text-coral-500 sm:block" aria-label="Super Admin" />
          )}
        </div>
      </DropdownTrigger>
      <DropdownMenu className="w-64">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-semibold text-navy-900">{name}</p>
          <p className="truncate text-xs text-navy-400">{email}</p>
        </div>
        <DropdownSeparator />
        {settingsHref && (
          <DropdownItem onClick={() => hardNavigate(settingsHref)}>
            <Settings className="h-4 w-4" /> Settings
          </DropdownItem>
        )}
        <DropdownItem onClick={signOut} destructive>
          <LogOut className="h-4 w-4" /> {loading ? "Signing out…" : "Sign out"}
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
