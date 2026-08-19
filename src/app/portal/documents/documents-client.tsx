"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Upload, File as FileIcon, Trash2, Pencil, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/table";
import { PageSpinner, SectionHeading } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
}
interface Asset {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  relatedContact: { id: string; firstName: string; lastName: string | null } | null;
  uploadedBy: { id: string; name: string } | null;
}
interface Template {
  id: string;
  name: string;
  content: string;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsClient({ contacts, canCreate, canEdit, canDelete }: { contacts: Contact[]; canCreate: boolean; canEdit: boolean; canDelete: boolean }) {
  return (
    <div>
      <SectionHeading title="Documents" description="Store files and generate documents from merge-field templates." />
      <Tabs defaultValue="files">
        <TabsList className="mb-6">
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="files">
          <FilesTab contacts={contacts} canCreate={canCreate} canDelete={canDelete} />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab contacts={contacts} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FilesTab({ contacts, canCreate, canDelete }: { contacts: Contact[]; canCreate: boolean; canDelete: boolean }) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachContactId, setAttachContactId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const res = await apiFetch<{ assets: Asset[] }>("/api/media-assets");
      setAssets(res.assets);
    } catch {
      toast({ title: "Couldn't load files", variant: "error" });
    }
  }

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (attachContactId) form.append("relatedContactId", attachContactId);
      const csrf = document.cookie.match(/(?:^|; )cco_csrf=([^;]*)/)?.[1];
      const res = await fetch("/api/media-assets", { method: "POST", body: form, headers: csrf ? { "x-csrf-token": decodeURIComponent(csrf) } : {} });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      toast({ title: "File uploaded", variant: "success" });
      await load();
    } catch (err) {
      toast({ title: "Couldn't upload file", description: err instanceof Error ? err.message : undefined, variant: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeAsset(a: Asset) {
    if (!confirm(`Delete "${a.fileName}"?`)) return;
    try {
      await apiDelete(`/api/media-assets/${a.id}`);
      toast({ title: "File deleted", variant: "success" });
      setAssets((prev) => prev?.filter((x) => x.id !== a.id) ?? null);
    } catch (err) {
      toast({ title: "Couldn't delete file", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    }
  }

  if (assets === null) return <PageSpinner />;

  return (
    <div>
      {canCreate && (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <Select className="max-w-xs" value={attachContactId} onChange={(e) => setAttachContactId(e.target.value)}>
              <option value="">Not attached to a contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  Attach to: {c.firstName} {c.lastName ?? ""}
                </option>
              ))}
            </Select>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            <Button onClick={() => fileInputRef.current?.click()} loading={uploading}>
              <Upload className="h-4 w-4" /> Upload File
            </Button>
          </div>
        </Card>
      )}

      {assets.length === 0 ? (
        <Card>
          <EmptyState icon={<FileIcon className="h-10 w-10" />} title="No files yet" description="Upload contracts, quotes, or any other files your team needs." />
        </Card>
      ) : (
        <Card className="divide-y divide-navy-50">
          {assets.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 p-4">
              <FileIcon className="h-5 w-5 shrink-0 text-coral-600" />
              <div className="min-w-0 flex-1">
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-medium text-navy-900 hover:underline">
                  {a.fileName}
                </a>
                <p className="truncate text-xs text-navy-400">
                  {formatBytes(a.sizeBytes)} · {formatDateTime(a.createdAt)}
                  {a.relatedContact && ` · ${a.relatedContact.firstName} ${a.relatedContact.lastName ?? ""}`}
                  {a.uploadedBy && ` · uploaded by ${a.uploadedBy.name}`}
                </p>
              </div>
              <a href={a.url} download target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" aria-label={`Download ${a.fileName}`}>
                  <Download className="h-4 w-4" />
                </Button>
              </a>
              {canDelete && (
                <Button variant="ghost" size="icon" aria-label={`Delete ${a.fileName}`} onClick={() => removeAsset(a)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function TemplatesTab({ contacts, canCreate, canEdit, canDelete }: { contacts: Contact[]; canCreate: boolean; canEdit: boolean; canDelete: boolean }) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [generateFor, setGenerateFor] = useState<Template | null>(null);

  async function load() {
    try {
      const res = await apiFetch<{ templates: Template[] }>("/api/document-templates");
      setTemplates(res.templates);
    } catch {
      toast({ title: "Couldn't load templates", variant: "error" });
    }
  }

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }
  function openEdit(t: Template) {
    setEditing(t);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function removeTemplate(t: Template) {
    if (!confirm(`Delete the "${t.name}" template?`)) return;
    try {
      await apiDelete(`/api/document-templates/${t.id}`);
      toast({ title: "Template deleted", variant: "success" });
      setTemplates((prev) => prev?.filter((x) => x.id !== t.id) ?? null);
    } catch (err) {
      toast({ title: "Couldn't delete template", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    }
  }

  if (templates === null) return <PageSpinner />;

  return (
    <div>
      {canCreate && (
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Template
          </Button>
        </div>
      )}
      {templates.length === 0 ? (
        <Card>
          <EmptyState title="No templates yet" description="Write a contract or quote once with {{firstName}}-style merge fields, then generate it for any contact." action={canCreate && <Button onClick={openCreate}>Create your first template</Button>} />
        </Card>
      ) : (
        <Card className="divide-y divide-navy-50">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-4">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-navy-900">{t.name}</p>
              <Button variant="outline" size="sm" onClick={() => setGenerateFor(t)}>
                <Printer className="h-3.5 w-3.5" /> Generate
              </Button>
              {canEdit && (
                <Button variant="ghost" size="icon" aria-label={`Edit ${t.name}`} onClick={() => openEdit(t)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button variant="ghost" size="icon" aria-label={`Delete ${t.name}`} onClick={() => removeTemplate(t)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}

      <TemplateDialog key={formKey} open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} onSaved={async () => { setDialogOpen(false); await load(); }} />
      <GenerateDialog key={generateFor?.id ?? "none"} template={generateFor} contacts={contacts} onClose={() => setGenerateFor(null)} />
    </div>
  );
}

function TemplateDialog({ open, onClose, editing, onSaved }: { open: boolean; onClose: () => void; editing: Template | null; onSaved: () => Promise<void> }) {
  const { toast } = useToast();
  const [name, setName] = useState(editing?.name ?? "");
  const [content, setContent] = useState(editing?.content ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (name.trim().length < 2) return toast({ title: "Enter a template name", variant: "error" });
    if (!content.trim()) return toast({ title: "Enter the document content", variant: "error" });
    setSaving(true);
    try {
      if (editing) await apiPatch(`/api/document-templates/${editing.id}`, { name, content });
      else await apiPost("/api/document-templates", { name, content });
      toast({ title: editing ? "Template updated" : "Template created", variant: "success" });
      await onSaved();
    } catch (err) {
      toast({ title: "Couldn't save template", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit Template" : "New Template"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            {editing ? "Save changes" : "Create Template"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Standard Service Agreement" autoFocus />
        </div>
        <div>
          <Label>Content (HTML)</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} placeholder="<h1>Agreement</h1>&#10;<p>This agreement is between us and {{fullName}}...</p>" />
          <FieldHint>Use {"{{firstName}}"}, {"{{lastName}}"}, {"{{fullName}}"}, {"{{email}}"} or {"{{company}}"} — replaced with the contact&apos;s details when generated.</FieldHint>
        </div>
      </div>
    </Dialog>
  );
}

function GenerateDialog({ template, contacts, onClose }: { template: Template | null; contacts: Contact[]; onClose: () => void }) {
  const [contactId, setContactId] = useState("");

  function generate() {
    if (!template) return;
    const url = `/portal/documents/templates/${template.id}/print${contactId ? `?contactId=${contactId}` : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  }

  return (
    <Dialog
      open={Boolean(template)}
      onClose={onClose}
      title={`Generate "${template?.name}"`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={generate}>
            <Printer className="h-4 w-4" /> Open document
          </Button>
        </>
      }
    >
      <div>
        <Label>For contact (optional)</Label>
        <Select value={contactId} onChange={(e) => setContactId(e.target.value)}>
          <option value="">None — show merge fields as-is</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName ?? ""}
            </option>
          ))}
        </Select>
        <FieldHint>Opens in a new tab, ready to print or save as a PDF.</FieldHint>
      </div>
    </Dialog>
  );
}
