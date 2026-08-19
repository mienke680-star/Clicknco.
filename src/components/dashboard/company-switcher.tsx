"use client";

import { useEffect, useState } from "react";
import { Building2, Check, ChevronsUpDown, LayoutDashboard } from "lucide-react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { apiFetch, apiPost, hardNavigate } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface CompanyOption {
  id: string;
  name: string;
  status: string;
  logoUrl: string | null;
}

export function CompanySwitcher({ activeCompanyId, activeCompanyName }: { activeCompanyId: string; activeCompanyName: string }) {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    apiFetch<{ companies: CompanyOption[] }>("/api/companies")
      .then((res) => setCompanies(res.companies))
      .catch(() => setCompanies([]));
  }, []);

  async function switchTo(companyId: string) {
    if (companyId === activeCompanyId) return;
    setSwitching(true);
    try {
      await apiPost("/api/auth/switch-company", { companyId });
      hardNavigate("/portal");
    } finally {
      setSwitching(false);
    }
  }

  if (companies.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-navy-700">
        <Building2 className="h-4 w-4 text-navy-400" />
        <span className="max-w-[160px] truncate">{activeCompanyName}</span>
      </div>
    );
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <div className="flex items-center gap-2 rounded-xl border border-navy-100 px-2.5 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50">
          <Building2 className="h-4 w-4 text-navy-400" />
          <span className="max-w-[140px] truncate">{activeCompanyName}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-navy-300" />
        </div>
      </DropdownTrigger>
      <DropdownMenu align="start" className="w-64">
        <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-400">Switch company</p>
        {companies.map((c) => (
          <DropdownItem key={c.id} onClick={() => switchTo(c.id)} className={cn(switching && "pointer-events-none opacity-60")}>
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{c.name}</span>
            {c.id === activeCompanyId && <Check className="h-4 w-4 shrink-0 text-coral-500" />}
          </DropdownItem>
        ))}
        <DropdownSeparator />
      </DropdownMenu>
    </Dropdown>
  );
}
