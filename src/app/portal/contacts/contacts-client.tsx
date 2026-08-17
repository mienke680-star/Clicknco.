"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Upload, Download, MoreHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@/components/ui/dropdown";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api-client";
import { formatDate, cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  color: string;
}
interface UserOption {
  id: string;
  name: string;
}
interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string | null;
  createdAt: string;
  tags: { tag: Tag }[];
  assignedUser: UserOption | null;
}

const SORT_OPTIONS = [
  { value: "created:desc", label: "Newest first" },
  { value: "created:asc", label: "Oldest first" },
  { value: "name:asc", label: "Name A–Z" },
  { value: "activity:desc", label: "Recently active" },
];

const STATUS_VARIANT: Record<string, "neutral" | "success" | "coral"> = {
  Lead: "neutral",
  Customer: "success",
};

export function ContactsClient({
  tags,
  users,
  canCreate,
  canEdit,
  canDelete,
  canExport,
}: {
  tags: Tag[];
  users: UserOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}) {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sort, setSort] = useState("created:desc");
  const [offset, setOffset] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(
    async (nextOffset: number, append: boolean) => {
      setLoading(true);
      const [sortKey, order] = sort.split(":");
      const params = new URLSearchParams({ sort: sortKey!, order: order!, offset: String(nextOffset), limit: "50" });
      if (query.trim()) params.set("q", query.trim());
      activeTags.forEach((t) => params.append("tag", t));

      try {
        const res = await apiFetch<{ contacts: Contact[]; total: number; hasMore: boolean }>(`/api/contacts?${params}`);
        setContacts((prev) => (append ? [...prev, ...res.contacts] : res.contacts));
        setTotal(res.total);
        setHasMore(res.hasMore);
        setOffset(nextOffset);
      } catch {
        toast({ title: "Couldn't load contacts", variant: "error" });
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, activeTags, sort],
  );

  useEffect(() => {
    const handle = setTimeout(() => load(0, false), 200);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeTags, sort]);

  function toggleTagFilter(id: string) {
    setActiveTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function handleDelete(contact: Contact) {
    if (!confirm(`Delete ${contact.firstName} ${contact.lastName ?? ""}? This can't be undone.`)) return;
    try {
      await apiDelete(`/api/contacts/${contact.id}`);
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      setTotal((t) => t - 1);
      toast({ title: "Contact deleted", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't delete contact", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-navy-900 sm:text-2xl">Contacts</h1>
          <p className="mt-1 text-sm text-navy-400">{total} contact{total === 1 ? "" : "s"} total</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canExport && (
            <Button variant="outline" onClick={() => window.open("/api/contacts/export", "_blank")}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          )}
          {canCreate && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
          )}
          {canCreate && (
            <Button
              onClick={() => {
                setFormKey((k) => k + 1);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add Contact
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts…" className="pl-9" />
        </div>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTagFilter(tag.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                activeTags.includes(tag.id)
                  ? "border-coral-500 bg-coral-500 text-white"
                  : "border-navy-100 bg-white text-navy-500 hover:bg-navy-50",
              )}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {contacts.length === 0 && !loading ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title={query || activeTags.length ? "No contacts match your filters" : "No contacts yet"}
          description={canCreate ? "Add your first contact or import a CSV to get started." : undefined}
          action={
            canCreate && !query && activeTags.length === 0 ? (
              <Button
                onClick={() => {
                  setFormKey((k) => k + 1);
                  setCreateOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add Contact
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Phone</TH>
                <TH>Company</TH>
                <TH>Tags</TH>
                <TH>Status</TH>
                <TH>Assigned</TH>
                <TH>Created</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {contacts.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/portal/contacts/${c.id}`} className="flex items-center gap-2.5 hover:underline">
                      <Avatar name={`${c.firstName} ${c.lastName ?? ""}`} size={28} />
                      <span className="font-medium text-navy-900">
                        {c.firstName} {c.lastName}
                      </span>
                    </Link>
                  </TD>
                  <TD>{c.email || "—"}</TD>
                  <TD>{c.phone || "—"}</TD>
                  <TD>{c.company || "—"}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 2).map((t) => (
                        <Badge key={t.tag.id} variant="neutral">
                          {t.tag.name}
                        </Badge>
                      ))}
                      {c.tags.length > 2 && <Badge variant="outline">+{c.tags.length - 2}</Badge>}
                    </div>
                  </TD>
                  <TD>{c.status && <Badge variant={STATUS_VARIANT[c.status] ?? "neutral"}>{c.status}</Badge>}</TD>
                  <TD>{c.assignedUser?.name || "—"}</TD>
                  <TD className="whitespace-nowrap text-sm text-navy-400">{formatDate(c.createdAt)}</TD>
                  <TD>
                    {(canEdit || canDelete) && (
                      <Dropdown>
                        <DropdownTrigger>
                          <button className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-50 cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownTrigger>
                        <DropdownMenu>
                          {canEdit && (
                            <DropdownItem
                              onClick={() => {
                                setFormKey((k) => k + 1);
                                setEditing(c);
                              }}
                            >
                              Edit
                            </DropdownItem>
                          )}
                          {canDelete && (
                            <DropdownItem destructive onClick={() => handleDelete(c)}>
                              Delete
                            </DropdownItem>
                          )}
                        </DropdownMenu>
                      </Dropdown>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" loading={loading} onClick={() => load(offset + 50, true)}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      <ContactFormDialog
        key={formKey}
        open={createOpen || Boolean(editing)}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        contact={editing}
        tags={tags}
        users={users}
        onSaved={(contact, isNew) => {
          if (isNew) {
            setContacts((prev) => [contact, ...prev]);
            setTotal((t) => t + 1);
          } else {
            setContacts((prev) => prev.map((c) => (c.id === contact.id ? contact : c)));
          }
          setCreateOpen(false);
          setEditing(null);
        }}
      />

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => {
          setImportOpen(false);
          load(0, false);
        }}
      />
    </div>
  );
}

function ContactFormDialog({
  open,
  onClose,
  contact,
  tags,
  users,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  contact: Contact | null;
  tags: Tag[];
  users: UserOption[];
  onSaved: (contact: Contact, isNew: boolean) => void;
}) {
  const { toast } = useToast();
  // Initialized once from `contact` — the parent remounts this component (via a
  // `key` that changes on every "Add"/"Edit" click) whenever it should show
  // different data, so there's no need to sync this from an effect.
  const [form, setForm] = useState(() => ({
    firstName: contact?.firstName ?? "",
    lastName: contact?.lastName ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    company: contact?.company ?? "",
    address: "",
    leadSource: "",
    status: contact?.status ?? "Lead",
    assignedUserId: contact?.assignedUser?.id ?? "",
  }));
  const [selectedTags, setSelectedTags] = useState<string[]>(() => contact?.tags.map((t) => t.tag.id) ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = { ...form, assignedUserId: form.assignedUserId || null, tagIds: selectedTags };
      const res = contact
        ? await apiPatch<{ contact: Contact }>(`/api/contacts/${contact.id}`, payload)
        : await apiPost<{ contact: Contact }>("/api/contacts", payload);
      onSaved(res.contact, !contact);
      toast({ title: contact ? "Contact updated" : "Contact created", variant: "success" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={contact ? "Edit contact" : "Add contact"}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-danger">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First name</Label>
            <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <Label>Last name</Label>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Company</Label>
          <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </div>
        <div>
          <Label>Address</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Lead</option>
              <option>Customer</option>
              <option>Inactive</option>
            </Select>
          </div>
          <div>
            <Label>Assigned to</Label>
            <Select value={form.assignedUserId} onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Lead source</Label>
          <Input value={form.leadSource} onChange={(e) => setForm({ ...form, leadSource: e.target.value })} placeholder="e.g. Referral, Website form" />
        </div>
        {tags.length > 0 && (
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    setSelectedTags((prev) => (prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id]))
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium cursor-pointer",
                    selectedTags.includes(tag.id) ? "border-coral-500 bg-coral-500 text-white" : "border-navy-100 text-navy-500 hover:bg-navy-50",
                  )}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {contact ? "Save changes" : "Create contact"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onImport() {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch<{ created: number; updated: number; skipped: number }>("/api/contacts/import", {
        method: "POST",
        body: formData,
      });
      toast({
        title: "Import complete",
        description: `${res.created} created, ${res.updated} updated, ${res.skipped} skipped.`,
        variant: "success",
      });
      onDone();
      setFile(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Import contacts" description="Upload a CSV with columns like First Name, Last Name, Email, Phone, Company.">
      <div className="space-y-4">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-danger">{error}</div>}
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-700 hover:file:bg-navy-100"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onImport} disabled={!file} loading={importing}>
            <Upload className="h-4 w-4" /> Import
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
