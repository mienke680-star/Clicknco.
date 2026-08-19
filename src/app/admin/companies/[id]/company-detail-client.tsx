"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LogIn,
  Ban,
  PlayCircle,
  Archive,
  Trash2,
  ChevronLeft,
  UserPlus,
  MoreVertical,
} from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { PageSpinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPost, apiPatch, apiDelete, ApiError, hardNavigate } from "@/lib/api-client";
import { formatDate, formatCurrency, timeAgo, isValidEmail } from "@/lib/utils";

type CompanyStatus = "SETUP" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

interface MemberRow {
  id: string;
  role: "ADMIN" | "STAFF";
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  staffRoleId: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null; lastLoginAt: string | null };
  staffRole: { id: string; name: string } | null;
}

interface BillingRecord {
  id: string;
  type: string;
  amount: string | number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface CompanyDetail {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  status: CompanyStatus;
  billingStatus: string;
  packageName: string | null;
  setupFee: string | number | null;
  monthlyFee: string | number | null;
  currency: string;
  nextBillingDate: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  brandPrimaryColor: string;
  brandAccentColor: string;
  brandFont: string;
  portalName: string | null;
  loginHeadline: string | null;
  loginImageUrl: string | null;
  portalFooterText: string | null;
  emailFromName: string | null;
  emailFromAddress: string | null;
  industry: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  timezone: string;
  notes: string | null;
  createdAt: string;
  _count: { memberships: number; contacts: number; pipelines: number; tasks: number };
  memberships: MemberRow[];
  staffRoles: { id: string; name: string }[];
  billingRecords: BillingRecord[];
}

const STATUS_BADGE: Record<CompanyStatus, "neutral" | "success" | "warning" | "danger"> = {
  SETUP: "neutral",
  ACTIVE: "success",
  SUSPENDED: "warning",
  ARCHIVED: "danger",
};

export function CompanyDetailClient({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [entering, setEntering] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ company: CompanyDetail }>(`/api/admin/companies/${companyId}`);
      setCompany(res.company);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else toast({ title: "Couldn't load company", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function enterCompany() {
    setEntering(true);
    try {
      await apiFetch("/api/auth/switch-company", { method: "POST", body: JSON.stringify({ companyId }) });
      hardNavigate("/portal");
    } catch (err) {
      toast({ title: "Couldn't enter company", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
      setEntering(false);
    }
  }

  async function setStatus(next: CompanyStatus) {
    if (!company) return;
    try {
      const res = await apiPatch<{ company: CompanyDetail }>(`/api/admin/companies/${companyId}`, { status: next });
      setCompany((prev) => (prev ? { ...prev, status: res.company.status } : prev));
      toast({ title: `${company.name} ${next === "ACTIVE" ? "is now active" : next.toLowerCase()}`, variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't update status", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    }
  }

  async function confirmDelete() {
    if (!company) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/companies/${companyId}`, { method: "DELETE", body: JSON.stringify({ confirmName: confirmText }) });
      toast({ title: "Company deleted", variant: "success" });
      hardNavigate("/admin/companies");
    } catch (err) {
      toast({ title: "Couldn't delete company", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
      setDeleting(false);
    }
  }

  if (loading) return <PageSpinner />;
  if (notFound || !company) {
    return (
      <EmptyState title="Company not found" description="It may have been deleted." action={<LinkButton href="/admin/companies">Back to Companies</LinkButton>} />
    );
  }

  return (
    <div>
      <Link href="/admin/companies" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ChevronLeft className="h-4 w-4" /> Companies
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={company.name} src={company.logoUrl} size={48} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-navy-900 sm:text-2xl">{company.name}</h1>
              <Badge variant={STATUS_BADGE[company.status]}>{company.status}</Badge>
            </div>
            <p className="text-sm text-navy-400">Subdomain: {company.subdomain} · Created {formatDate(company.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={enterCompany} loading={entering}>
            <LogIn className="h-4 w-4" /> Enter Company
          </Button>
          <Dropdown>
            <DropdownTrigger>
              <Button variant="outline" size="icon" aria-label="Company actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              {company.status === "SETUP" && (
                <DropdownItem onClick={() => setStatus("ACTIVE")}>
                  <PlayCircle className="h-4 w-4" /> Launch Company
                </DropdownItem>
              )}
              {company.status === "ACTIVE" && (
                <DropdownItem onClick={() => setStatus("SUSPENDED")}>
                  <Ban className="h-4 w-4" /> Suspend
                </DropdownItem>
              )}
              {(company.status === "SUSPENDED" || company.status === "ARCHIVED") && (
                <DropdownItem onClick={() => setStatus("ACTIVE")}>
                  <PlayCircle className="h-4 w-4" /> Reactivate
                </DropdownItem>
              )}
              {(company.status === "ACTIVE" || company.status === "SUSPENDED") && (
                <DropdownItem onClick={() => setStatus("ARCHIVED")}>
                  <Archive className="h-4 w-4" /> Archive
                </DropdownItem>
              )}
              <DropdownSeparator />
              <DropdownItem
                destructive
                onClick={() => {
                  setConfirmText("");
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete company
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Team members" value={company._count.memberships} />
        <MiniStat label="Contacts" value={company._count.contacts} />
        <MiniStat label="Pipelines" value={company._count.pipelines} />
        <MiniStat label="Tasks" value={company._count.tasks} />
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="package">Package & Billing</TabsTrigger>
          <TabsTrigger value="team">Team ({company.memberships.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="pt-6">
          <ProfileTab company={company} onSaved={(c) => setCompany(c)} />
        </TabsContent>
        <TabsContent value="branding" className="pt-6">
          <BrandingTab company={company} onSaved={(c) => setCompany(c)} />
        </TabsContent>
        <TabsContent value="package" className="pt-6">
          <PackageTab company={company} onSaved={(c) => setCompany(c)} />
        </TabsContent>
        <TabsContent value="team" className="pt-6">
          <TeamTab company={company} onChanged={(c) => setCompany(c)} />
        </TabsContent>
      </Tabs>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${company.name}?`}
        description="This permanently deletes every contact, pipeline, task, form, and record this company owns. This can't be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} disabled={confirmText !== company.name} onClick={confirmDelete}>
              Delete permanently
            </Button>
          </>
        }
      >
        <Label>
          Type <span className="font-semibold text-navy-900">{company.name}</span> to confirm
        </Label>
        <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={company.name} />
      </Dialog>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-navy-900">{value}</p>
    </Card>
  );
}

function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end">
      <Button onClick={onSave} loading={saving}>
        Save changes
      </Button>
    </div>
  );
}

function ProfileTab({ company, onSaved }: { company: CompanyDetail; onSaved: (c: CompanyDetail) => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    name: company.name,
    slug: company.slug,
    subdomain: company.subdomain,
    industry: company.industry ?? "",
    contactPerson: company.contactPerson ?? "",
    contactEmail: company.contactEmail ?? "",
    contactPhone: company.contactPhone ?? "",
    website: company.website ?? "",
    address1: company.address1 ?? "",
    address2: company.address2 ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    postalCode: company.postalCode ?? "",
    country: company.country ?? "",
    timezone: company.timezone,
    notes: company.notes ?? "",
  }));

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await apiPatch<{ company: CompanyDetail }>(`/api/admin/companies/${company.id}`, form);
      onSaved(res.company);
      toast({ title: "Profile saved", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't save", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label>Company name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} />
          </div>
          <div>
            <Label>Subdomain</Label>
            <Input value={form.subdomain} onChange={(e) => set("subdomain", e.target.value.toLowerCase())} />
          </div>
          <div>
            <Label>Industry</Label>
            <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} />
          </div>
          <div>
            <Label>Primary contact</Label>
            <Input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
          </div>
          <div>
            <Label>Contact email</Label>
            <Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
          </div>
          <div>
            <Label>Contact phone</Label>
            <Input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
          </div>
          <div>
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => set("website", e.target.value)} />
          </div>
          <div>
            <Label>Address line 1</Label>
            <Input value={form.address1} onChange={(e) => set("address1", e.target.value)} />
          </div>
          <div>
            <Label>Address line 2</Label>
            <Input value={form.address2} onChange={(e) => set("address2", e.target.value)} />
          </div>
          <div>
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <Label>State / Province</Label>
            <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
          </div>
          <div>
            <Label>Postal code</Label>
            <Input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
          </div>
          <div>
            <Label>Timezone</Label>
            <Input value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Private notes</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={4} />
          <FieldHint>Only visible to you, never to this company&apos;s users.</FieldHint>
        </div>
        <SaveBar saving={saving} onSave={save} />
      </CardContent>
    </Card>
  );
}

function BrandingTab({ company, onSaved }: { company: CompanyDetail; onSaved: (c: CompanyDetail) => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    logoUrl: company.logoUrl ?? "",
    faviconUrl: company.faviconUrl ?? "",
    brandPrimaryColor: company.brandPrimaryColor,
    brandAccentColor: company.brandAccentColor,
    brandFont: company.brandFont,
    portalName: company.portalName ?? "",
    loginHeadline: company.loginHeadline ?? "",
    loginImageUrl: company.loginImageUrl ?? "",
    portalFooterText: company.portalFooterText ?? "",
    emailFromName: company.emailFromName ?? "",
    emailFromAddress: company.emailFromAddress ?? "",
  }));

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await apiPatch<{ company: CompanyDetail }>(`/api/admin/companies/${company.id}`, form);
      onSaved(res.company);
      toast({ title: "Branding saved", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't save", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
      <Card>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label>Logo URL</Label>
              <Input value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} />
            </div>
            <div>
              <Label>Favicon URL</Label>
              <Input value={form.faviconUrl} onChange={(e) => set("faviconUrl", e.target.value)} />
            </div>
            <div>
              <Label>Primary color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(form.brandPrimaryColor) ? form.brandPrimaryColor : "#000000"}
                  onChange={(e) => set("brandPrimaryColor", e.target.value)}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-navy-200 bg-white p-1"
                />
                <Input value={form.brandPrimaryColor} onChange={(e) => set("brandPrimaryColor", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Accent color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(form.brandAccentColor) ? form.brandAccentColor : "#000000"}
                  onChange={(e) => set("brandAccentColor", e.target.value)}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-navy-200 bg-white p-1"
                />
                <Input value={form.brandAccentColor} onChange={(e) => set("brandAccentColor", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Font</Label>
              <Input value={form.brandFont} onChange={(e) => set("brandFont", e.target.value)} />
            </div>
            <div>
              <Label>Portal name</Label>
              <Input value={form.portalName} onChange={(e) => set("portalName", e.target.value)} />
            </div>
            <div>
              <Label>Login headline</Label>
              <Input value={form.loginHeadline} onChange={(e) => set("loginHeadline", e.target.value)} />
            </div>
            <div>
              <Label>Login image URL</Label>
              <Input value={form.loginImageUrl} onChange={(e) => set("loginImageUrl", e.target.value)} />
            </div>
            <div>
              <Label>Portal footer text</Label>
              <Input value={form.portalFooterText} onChange={(e) => set("portalFooterText", e.target.value)} />
            </div>
            <div>
              <Label>Email &quot;from&quot; name</Label>
              <Input value={form.emailFromName} onChange={(e) => set("emailFromName", e.target.value)} />
            </div>
            <div>
              <Label>Email &quot;from&quot; address</Label>
              <Input type="email" value={form.emailFromAddress} onChange={(e) => set("emailFromAddress", e.target.value)} />
            </div>
          </div>
          <SaveBar saving={saving} onSave={save} />
        </CardContent>
      </Card>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Preview</p>
        <div className="overflow-hidden rounded-2xl border border-navy-100 shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: form.brandPrimaryColor }}>
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoUrl} alt="" className="h-6 w-6 rounded object-cover" />
            ) : (
              <div className="h-6 w-6 rounded bg-white/30" />
            )}
            <span className="text-sm font-semibold text-white">{form.portalName || company.name}</span>
          </div>
          <div className="space-y-3 bg-white p-4">
            <p className="text-sm font-medium text-navy-900">{form.loginHeadline || "Welcome back"}</p>
            <div className="h-8 rounded-lg border border-navy-100" />
            <div className="h-8 rounded-lg border border-navy-100" />
            <div
              className="h-8 rounded-lg text-center text-xs font-semibold leading-8 text-white"
              style={{ backgroundColor: form.brandAccentColor }}
            >
              Sign in
            </div>
          </div>
          {form.portalFooterText && <div className="border-t border-navy-50 bg-navy-50/50 px-4 py-2 text-center text-[11px] text-navy-400">{form.portalFooterText}</div>}
        </div>
      </div>
    </div>
  );
}

function PackageTab({ company, onSaved }: { company: CompanyDetail; onSaved: (c: CompanyDetail) => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    packageName: company.packageName ?? "",
    setupFee: company.setupFee != null ? String(company.setupFee) : "",
    monthlyFee: company.monthlyFee != null ? String(company.monthlyFee) : "",
    currency: company.currency,
    billingStatus: company.billingStatus,
    nextBillingDate: company.nextBillingDate ? company.nextBillingDate.slice(0, 10) : "",
  }));

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await apiPatch<{ company: CompanyDetail }>(`/api/admin/companies/${company.id}`, form);
      onSaved(res.company);
      toast({ title: "Package saved", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't save", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label>Package name</Label>
              <Input value={form.packageName} onChange={(e) => set("packageName", e.target.value)} />
            </div>
            <div>
              <Label>Billing status</Label>
              <Select value={form.billingStatus} onChange={(e) => set("billingStatus", e.target.value)}>
                {["TRIAL", "ACTIVE", "OVERDUE", "SUSPENDED", "CANCELLED"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Setup fee</Label>
              <Input type="number" min="0" step="0.01" value={form.setupFee} onChange={(e) => set("setupFee", e.target.value)} />
            </div>
            <div>
              <Label>Monthly fee</Label>
              <Input type="number" min="0" step="0.01" value={form.monthlyFee} onChange={(e) => set("monthlyFee", e.target.value)} />
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
            </div>
            <div>
              <Label>Next billing date</Label>
              <Input type="date" value={form.nextBillingDate} onChange={(e) => set("nextBillingDate", e.target.value)} />
            </div>
          </div>
          <FieldHint>Billing stays manual and Super-Admin-controlled here — there&apos;s no self-service checkout.</FieldHint>
          <SaveBar saving={saving} onSave={save} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className="mb-3 text-sm font-semibold text-navy-900">Billing history</p>
          {company.billingRecords.length === 0 ? (
            <EmptyState title="No billing records yet" description="A full billing ledger (invoices, payments, one-off charges) is coming in a later update." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Type</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                  <TH>Due</TH>
                  <TH>Created</TH>
                </TR>
              </THead>
              <TBody>
                {company.billingRecords.map((r) => (
                  <TR key={r.id}>
                    <TD>{r.type}</TD>
                    <TD>{formatCurrency(r.amount, company.currency)}</TD>
                    <TD>
                      <Badge variant={r.status === "PAID" ? "success" : r.status === "OVERDUE" ? "danger" : "neutral"}>{r.status}</Badge>
                    </TD>
                    <TD>{r.dueDate ? formatDate(r.dueDate) : "—"}</TD>
                    <TD>{formatDate(r.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TeamTab({ company, onChanged }: { company: CompanyDetail; onChanged: (c: CompanyDetail) => void }) {
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [inviteStaffRoleId, setInviteStaffRoleId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const res = await apiFetch<{ company: CompanyDetail }>(`/api/admin/companies/${company.id}`);
    onChanged(res.company);
  }

  function openInvite() {
    setInviteName("");
    setInviteEmail("");
    setInviteRole("STAFF");
    setInviteStaffRoleId("");
    setInviteOpen(true);
  }

  async function sendInvite() {
    if (inviteName.trim().length < 2 || !isValidEmail(inviteEmail)) {
      toast({ title: "Enter a valid name and email", variant: "error" });
      return;
    }
    setInviting(true);
    try {
      await apiPost(`/api/admin/companies/${company.id}/members`, {
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
        staffRoleId: inviteStaffRoleId || undefined,
      });
      toast({ title: `Invited ${inviteName}`, variant: "success" });
      setInviteOpen(false);
      await refresh();
    } catch (err) {
      toast({ title: "Couldn't invite that person", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setInviting(false);
    }
  }

  async function updateMember(membershipId: string, body: Record<string, unknown>) {
    setBusyId(membershipId);
    try {
      await apiPatch(`/api/admin/companies/${company.id}/members/${membershipId}`, body);
      await refresh();
    } catch (err) {
      toast({ title: "Couldn't update member", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(member: MemberRow) {
    if (!confirm(`Remove ${member.user.name} from ${company.name}?`)) return;
    setBusyId(member.id);
    try {
      await apiDelete(`/api/admin/companies/${company.id}/members/${member.id}`);
      toast({ title: "Member removed", variant: "success" });
      await refresh();
    } catch (err) {
      toast({ title: "Couldn't remove member", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openInvite}>
          <UserPlus className="h-4 w-4" /> Invite Member
        </Button>
      </div>

      {company.memberships.length === 0 ? (
        <EmptyState title="No team members yet" description="Invite the first person to give them a login." action={<Button onClick={openInvite}>Invite Member</Button>} />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Member</TH>
              <TH>Role</TH>
              <TH>Staff role</TH>
              <TH>Status</TH>
              <TH>Last login</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {company.memberships.map((m) => (
              <TR key={m.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={m.user.name} src={m.user.avatarUrl} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy-900">{m.user.name}</p>
                      <p className="truncate text-xs text-navy-400">{m.user.email}</p>
                    </div>
                  </div>
                </TD>
                <TD>
                  <Select
                    value={m.role}
                    disabled={busyId === m.id}
                    onChange={(e) => updateMember(m.id, { role: e.target.value })}
                    className="h-8 w-28 text-xs"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="STAFF">Staff</option>
                  </Select>
                </TD>
                <TD>
                  {m.role === "STAFF" ? (
                    <Select
                      value={m.staffRoleId ?? ""}
                      disabled={busyId === m.id}
                      onChange={(e) => updateMember(m.id, { staffRoleId: e.target.value || null })}
                      className="h-8 w-36 text-xs"
                    >
                      <option value="">No staff role</option>
                      {company.staffRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <span className="text-navy-300">—</span>
                  )}
                </TD>
                <TD>
                  <Badge variant={m.status === "ACTIVE" ? "success" : m.status === "INVITED" ? "neutral" : "warning"}>{m.status}</Badge>
                </TD>
                <TD>{m.user.lastLoginAt ? timeAgo(m.user.lastLoginAt) : "Never"}</TD>
                <TD>
                  <div className="flex justify-end gap-1.5">
                    {m.status === "SUSPENDED" ? (
                      <Button variant="outline" size="sm" disabled={busyId === m.id} onClick={() => updateMember(m.id, { status: "ACTIVE" })}>
                        Reactivate
                      </Button>
                    ) : (
                      m.status === "ACTIVE" && (
                        <Button variant="outline" size="sm" disabled={busyId === m.id} onClick={() => updateMember(m.id, { status: "SUSPENDED" })}>
                          Suspend
                        </Button>
                      )
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${m.user.name}`}
                      disabled={busyId === m.id}
                      onClick={() => removeMember(m)}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite team member"
        description={`Add someone to ${company.name}.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button loading={inviting} onClick={sendInvite}>
              Send invite
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Full name</Label>
            <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jordan Lee" autoFocus />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="jordan@riverstone.com" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "STAFF")}>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>
          {inviteRole === "STAFF" && company.staffRoles.length > 0 && (
            <div>
              <Label>Staff role (permissions)</Label>
              <Select value={inviteStaffRoleId} onChange={(e) => setInviteStaffRoleId(e.target.value)}>
                <option value="">No staff role yet</option>
                {company.staffRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
