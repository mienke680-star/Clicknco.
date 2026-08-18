"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Building2, LogIn, Pencil, Ban, PlayCircle, Archive, Trash2, MoreHorizontal } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { PageSpinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPatch, ApiError, hardNavigate } from "@/lib/api-client";
import { formatDate, formatCurrency, cn } from "@/lib/utils";

type CompanyStatus = "SETUP" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  logoUrl: string | null;
  status: CompanyStatus;
  billingStatus: string;
  industry: string | null;
  packageName: string | null;
  monthlyFee: string | number | null;
  currency: string;
  createdAt: string;
  _count: { memberships: number; contacts: number };
}

const STATUS_BADGE: Record<CompanyStatus, "neutral" | "success" | "warning" | "danger"> = {
  SETUP: "neutral",
  ACTIVE: "success",
  SUSPENDED: "warning",
  ARCHIVED: "danger",
};

const STATUS_FILTERS = ["All", "SETUP", "ACTIVE", "SUSPENDED", "ARCHIVED"] as const;

export function CompaniesClient() {
  const { toast } = useToast();
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [deleteTarget, setDeleteTarget] = useState<CompanyRow | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [enteringId, setEnteringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status !== "All") params.set("status", status);
    try {
      const res = await apiFetch<{ companies: CompanyRow[] }>(`/api/admin/companies?${params}`);
      setCompanies(res.companies);
    } catch {
      toast({ title: "Couldn't load companies", variant: "error" });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status]);

  useEffect(() => {
    const handle = setTimeout(load, 200);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status]);

  async function enterCompany(company: CompanyRow) {
    setEnteringId(company.id);
    try {
      await apiFetch("/api/auth/switch-company", { method: "POST", body: JSON.stringify({ companyId: company.id }) });
      hardNavigate("/portal");
    } catch (err) {
      toast({ title: "Couldn't enter company", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
      setEnteringId(null);
    }
  }

  async function setStatusFor(company: CompanyRow, next: CompanyStatus) {
    try {
      await apiPatch(`/api/admin/companies/${company.id}`, { status: next });
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, status: next } : c)));
      toast({ title: `${company.name} ${next === "ACTIVE" ? "is now active" : next.toLowerCase()}`, variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't update status", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/companies/${deleteTarget.id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirmName: confirmText }),
      });
      setCompanies((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast({ title: "Company deleted", variant: "success" });
      setDeleteTarget(null);
      setConfirmText("");
    } catch (err) {
      toast({ title: "Couldn't delete company", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-navy-900 sm:text-2xl">Companies</h1>
          <p className="mt-1 text-sm text-navy-400">
            {companies.length} compan{companies.length === 1 ? "y" : "ies"}
            {status !== "All" ? ` · ${status.toLowerCase()}` : ""}
          </p>
        </div>
        <LinkButton href="/admin/companies/new">
          <Plus className="h-4 w-4" /> Create Company
        </LinkButton>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                status === s ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 text-navy-600 hover:bg-navy-50",
              )}
            >
              {s === "All" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : companies.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No companies yet"
          description="Create your first company to design its system and hand it a login."
          action={<LinkButton href="/admin/companies/new">Create Company</LinkButton>}
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Company</TH>
              <TH>Status</TH>
              <TH>Package</TH>
              <TH>Members</TH>
              <TH>Contacts</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {companies.map((c) => (
              <TR key={c.id}>
                <TD>
                  <button onClick={() => router.push(`/admin/companies/${c.id}`)} className="flex cursor-pointer items-center gap-3 text-left">
                    <Avatar name={c.name} src={c.logoUrl} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy-900">{c.name}</p>
                      <p className="truncate text-xs text-navy-400">Subdomain: {c.subdomain}</p>
                    </div>
                  </button>
                </TD>
                <TD>
                  <Badge variant={STATUS_BADGE[c.status]}>{c.status}</Badge>
                </TD>
                <TD>
                  {c.packageName ? (
                    <div>
                      <p className="text-sm text-navy-800">{c.packageName}</p>
                      {c.monthlyFee != null && <p className="text-xs text-navy-400">{formatCurrency(c.monthlyFee, c.currency)}/mo</p>}
                    </div>
                  ) : (
                    <span className="text-navy-300">—</span>
                  )}
                </TD>
                <TD>{c._count.memberships}</TD>
                <TD>{c._count.contacts}</TD>
                <TD>{formatDate(c.createdAt)}</TD>
                <TD>
                  <div className="flex justify-end">
                    <Dropdown>
                      <DropdownTrigger>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${c.name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu>
                        <DropdownItem onClick={() => enterCompany(c)}>
                          <LogIn className="h-4 w-4" /> {enteringId === c.id ? "Entering…" : "Enter Company"}
                        </DropdownItem>
                        <DropdownItem onClick={() => router.push(`/admin/companies/${c.id}`)}>
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownItem>
                        <DropdownSeparator />
                        {c.status === "SETUP" && (
                          <DropdownItem onClick={() => setStatusFor(c, "ACTIVE")}>
                            <PlayCircle className="h-4 w-4" /> Launch Company
                          </DropdownItem>
                        )}
                        {c.status === "ACTIVE" && (
                          <DropdownItem onClick={() => setStatusFor(c, "SUSPENDED")}>
                            <Ban className="h-4 w-4" /> Suspend
                          </DropdownItem>
                        )}
                        {(c.status === "SUSPENDED" || c.status === "ARCHIVED") && (
                          <DropdownItem onClick={() => setStatusFor(c, "ACTIVE")}>
                            <PlayCircle className="h-4 w-4" /> Reactivate
                          </DropdownItem>
                        )}
                        {(c.status === "ACTIVE" || c.status === "SUSPENDED") && (
                          <DropdownItem onClick={() => setStatusFor(c, "ARCHIVED")}>
                            <Archive className="h-4 w-4" /> Archive
                          </DropdownItem>
                        )}
                        <DropdownSeparator />
                        <DropdownItem
                          destructive
                          onClick={() => {
                            setDeleteTarget(c);
                            setConfirmText("");
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? "company"}?`}
        description="This permanently deletes every contact, pipeline, task, form, and record this company owns. This can't be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} disabled={confirmText !== deleteTarget?.name} onClick={confirmDelete}>
              Delete permanently
            </Button>
          </>
        }
      >
        <Label>
          Type <span className="font-semibold text-navy-900">{deleteTarget?.name}</span> to confirm
        </Label>
        <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={deleteTarget?.name} />
      </Dialog>
    </div>
  );
}
