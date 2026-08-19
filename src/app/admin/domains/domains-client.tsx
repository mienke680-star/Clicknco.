"use client";

import { useEffect, useState } from "react";
import { Globe, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { PageSpinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

type DnsStatus = "PENDING" | "VERIFIED" | "FAILED";
type SslStatus = "NONE" | "PENDING" | "ACTIVE" | "FAILED";

interface DomainRow {
  id: string;
  domain: string;
  type: "PRIMARY" | "SUBDOMAIN";
  isPrimary: boolean;
  dnsStatus: DnsStatus;
  sslStatus: SslStatus;
  createdAt: string;
  company: { id: string; name: string };
}

const DNS_BADGE: Record<DnsStatus, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  VERIFIED: "success",
  FAILED: "danger",
};
const SSL_BADGE: Record<SslStatus, "neutral" | "warning" | "success" | "danger"> = {
  NONE: "neutral",
  PENDING: "warning",
  ACTIVE: "success",
  FAILED: "danger",
};

export function DomainsClient({ companies }: { companies: { id: string; name: string }[] }) {
  const { toast } = useToast();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ domains: DomainRow[] }>("/api/admin/domains");
      setDomains(res.domains);
    } catch {
      toast({ title: "Couldn't load domains", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAction(id: string, action: string) {
    setBusyId(id);
    try {
      const res = await apiPatch<{ domain: DomainRow }>(`/api/admin/domains/${id}`, { action });
      setDomains((prev) => {
        const next = prev.map((d) => (d.id === res.domain.id ? res.domain : d));
        if (action === "set-primary") {
          return next.map((d) => (d.id === res.domain.id ? d : d.company.id === res.domain.company.id ? { ...d, isPrimary: false } : d));
        }
        return next;
      });
    } catch (err) {
      toast({ title: "Couldn't update domain", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(d: DomainRow) {
    if (!confirm(`Remove ${d.domain}? This can't be undone.`)) return;
    setBusyId(d.id);
    try {
      await apiDelete(`/api/admin/domains/${d.id}`);
      setDomains((prev) => prev.filter((x) => x.id !== d.id));
      toast({ title: "Domain removed", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't remove domain", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Add domain
        </Button>
      </div>

      {loading ? (
        <PageSpinner />
      ) : domains.length === 0 ? (
        <EmptyState icon={<Globe className="h-10 w-10" />} title="No domains connected yet" description="Add a custom domain or subdomain and connect it to a company." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Domain</TH>
              <TH>Company</TH>
              <TH>Type</TH>
              <TH>DNS</TH>
              <TH>SSL</TH>
              <TH>Added</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {domains.map((d) => (
              <TR key={d.id}>
                <TD>
                  <div className="flex items-center gap-1.5">
                    {d.isPrimary && <Star className="h-3.5 w-3.5 fill-coral-500 text-coral-500" />}
                    <span className="font-medium text-navy-900">{d.domain}</span>
                  </div>
                </TD>
                <TD>{d.company.name}</TD>
                <TD className="text-xs text-navy-500">{d.type === "PRIMARY" ? "Primary" : "Subdomain"}</TD>
                <TD>
                  <Badge variant={DNS_BADGE[d.dnsStatus]} dot>
                    {d.dnsStatus}
                  </Badge>
                </TD>
                <TD>
                  <Badge variant={SSL_BADGE[d.sslStatus]} dot>
                    {d.sslStatus}
                  </Badge>
                </TD>
                <TD className="whitespace-nowrap text-sm text-navy-400">{formatDate(d.createdAt)}</TD>
                <TD>
                  <div className="flex flex-wrap gap-1.5">
                    {d.dnsStatus !== "VERIFIED" && (
                      <Button variant="outline" size="sm" loading={busyId === d.id} onClick={() => runAction(d.id, "verify-dns")}>
                        Verify DNS
                      </Button>
                    )}
                    {d.dnsStatus === "VERIFIED" && d.sslStatus !== "ACTIVE" && (
                      <Button variant="outline" size="sm" loading={busyId === d.id} onClick={() => runAction(d.id, "activate-ssl")}>
                        Activate SSL
                      </Button>
                    )}
                    {!d.isPrimary && (
                      <Button variant="ghost" size="sm" loading={busyId === d.id} onClick={() => runAction(d.id, "set-primary")}>
                        Set primary
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50" loading={busyId === d.id} onClick={() => remove(d)}>
                      Remove
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <AddDomainDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        companies={companies}
        onCreated={(d) => setDomains((prev) => [d, ...prev])}
      />
    </div>
  );
}

function AddDomainDialog({
  open,
  onClose,
  companies,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  companies: { id: string; name: string }[];
  onCreated: (d: DomainRow) => void;
}) {
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [domain, setDomain] = useState("");
  const [type, setType] = useState<"PRIMARY" | "SUBDOMAIN">("SUBDOMAIN");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    if (!companyId) return setError("Select a company");
    if (!domain.trim()) return setError("Enter a domain");
    setSaving(true);
    try {
      const res = await apiPost<{ domain: DomainRow }>("/api/admin/domains", { companyId, domain: domain.trim(), type });
      onCreated(res.domain);
      toast({ title: "Domain added", variant: "success" });
      setDomain("");
      setType("SUBDOMAIN");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add domain");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add domain"
      description="Connect a custom domain or subdomain to a company. DNS and SSL start pending until verified."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Add domain
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Company</Label>
          <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Domain</Label>
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="clients.example.com" />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as "PRIMARY" | "SUBDOMAIN")}>
            <option value="SUBDOMAIN">Subdomain</option>
            <option value="PRIMARY">Primary</option>
          </Select>
        </div>
        {error && <FieldError>{error}</FieldError>}
      </div>
    </Dialog>
  );
}
