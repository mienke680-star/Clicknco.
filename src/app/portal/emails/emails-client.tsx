"use client";

import { useEffect, useState } from "react";
import { Plus, Mail, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { PageSpinner, SectionHeading } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
}
interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
}
interface EmailMessageRow {
  id: string;
  toEmail: string;
  subject: string;
  status: "QUEUED" | "SENT" | "FAILED";
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  contact: { id: string; firstName: string; lastName: string | null } | null;
}

const STATUS_VARIANT: Record<string, "warning" | "success" | "danger"> = { QUEUED: "warning", SENT: "success", FAILED: "danger" };

export function EmailsClient({ contacts, canCreate, canEdit, canDelete }: { contacts: Contact[]; canCreate: boolean; canEdit: boolean; canDelete: boolean }) {
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <div>
      <SectionHeading
        title="Emails"
        description="Send approved templates, one-off emails and scheduled follow-ups."
        action={
          canCreate && (
            <Button onClick={() => setComposeOpen(true)}>
              <Mail className="h-4 w-4" /> Compose
            </Button>
          )
        }
      />

      <Tabs defaultValue="log">
        <TabsList className="mb-6">
          <TabsTrigger value="log">Sent &amp; Scheduled</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="log">
          <LogTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
        </TabsContent>
      </Tabs>

      <ComposeDialog open={composeOpen} onClose={() => setComposeOpen(false)} contacts={contacts} />
    </div>
  );
}

function LogTab() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<EmailMessageRow[] | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      apiFetch<{ messages: EmailMessageRow[] }>("/api/emails")
        .then((res) => setMessages(res.messages))
        .catch(() => toast({ title: "Couldn't load emails", variant: "error" }));
    }, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (messages === null) return <PageSpinner />;
  if (messages.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Mail className="h-10 w-10" />} title="No emails yet" description="Sent and scheduled emails will show up here." />
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto">
      <Table>
        <THead>
          <TR>
            <TH>Status</TH>
            <TH>To</TH>
            <TH>Subject</TH>
            <TH>When</TH>
          </TR>
        </THead>
        <TBody>
          {messages.map((m) => (
            <TR key={m.id}>
              <TD>
                <Badge variant={STATUS_VARIANT[m.status]} dot>
                  {m.status === "QUEUED" ? "Scheduled" : m.status === "SENT" ? "Sent" : "Failed"}
                </Badge>
              </TD>
              <TD>{m.contact ? `${m.contact.firstName} ${m.contact.lastName ?? ""}` : m.toEmail}</TD>
              <TD className="max-w-xs truncate">{m.subject}</TD>
              <TD className="whitespace-nowrap text-navy-400">
                {m.status === "QUEUED" && m.scheduledAt ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {formatDateTime(m.scheduledAt)}
                  </span>
                ) : (
                  formatDateTime(m.sentAt ?? m.createdAt)
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

function TemplatesTab({ canCreate, canEdit, canDelete }: { canCreate: boolean; canEdit: boolean; canDelete: boolean }) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function load() {
    try {
      const res = await apiFetch<{ templates: Template[] }>("/api/email-templates");
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
      await apiDelete(`/api/email-templates/${t.id}`);
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
          <EmptyState title="No templates yet" description="Save reusable subject lines and bodies with {{firstName}}-style merge fields." action={canCreate && <Button onClick={openCreate}>Create your first template</Button>} />
        </Card>
      ) : (
        <Card className="divide-y divide-navy-50">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy-900">{t.name}</p>
                <p className="truncate text-xs text-navy-400">{t.subject}</p>
              </div>
              {t.category && <Badge variant="neutral">{t.category}</Badge>}
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
    </div>
  );
}

function TemplateDialog({ open, onClose, editing, onSaved }: { open: boolean; onClose: () => void; editing: Template | null; onSaved: () => Promise<void> }) {
  const { toast } = useToast();
  const [name, setName] = useState(editing?.name ?? "");
  const [subject, setSubject] = useState(editing?.subject ?? "");
  const [body, setBody] = useState(editing?.body ?? "");
  const [category, setCategory] = useState(editing?.category ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (name.trim().length < 2) return toast({ title: "Enter a template name", variant: "error" });
    if (!subject.trim() || !body.trim()) return toast({ title: "Enter a subject and body", variant: "error" });
    setSaving(true);
    try {
      if (editing) await apiPatch(`/api/email-templates/${editing.id}`, { name, subject, body, category });
      else await apiPost("/api/email-templates", { name, subject, body, category });
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
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Follow-up after viewing" autoFocus />
        </div>
        <div>
          <Label>Category (optional)</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Follow-up" />
        </div>
        <div>
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Great meeting you, {{firstName}}!" />
        </div>
        <div>
          <Label>Body</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Hi {{firstName}},&#10;&#10;..." />
          <FieldHint>Use {"{{firstName}}"}, {"{{lastName}}"}, {"{{fullName}}"}, {"{{email}}"} or {"{{company}}"} — they&apos;re replaced with the recipient&apos;s details when sent.</FieldHint>
        </div>
      </div>
    </Dialog>
  );
}

function ComposeDialog({ open, onClose, contacts }: { open: boolean; onClose: () => void; contacts: Contact[] }) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contactId, setContactId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      apiFetch<{ templates: Template[] }>("/api/email-templates").then((res) => setTemplates(res.templates)).catch(() => {});
    }, 0);
    return () => clearTimeout(handle);
  }, [open]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  }

  async function submit() {
    if (!contactId) return toast({ title: "Choose a recipient", variant: "error" });
    if (!subject.trim() || !body.trim()) return toast({ title: "Enter a subject and body", variant: "error" });
    if (scheduleLater && !scheduledAt) return toast({ title: "Choose when to send", variant: "error" });

    setSending(true);
    try {
      await apiPost("/api/emails", {
        contactId,
        templateId: templateId || undefined,
        subject,
        body,
        scheduledAt: scheduleLater ? new Date(scheduledAt).toISOString() : undefined,
      });
      toast({ title: scheduleLater ? "Email scheduled" : "Email sent", variant: "success" });
      setContactId("");
      setTemplateId("");
      setSubject("");
      setBody("");
      setScheduleLater(false);
      setScheduledAt("");
      onClose();
    } catch (err) {
      toast({ title: "Couldn't send email", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Compose Email"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={sending} onClick={submit}>
            {scheduleLater ? "Schedule" : "Send"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>To</Label>
          <Select value={contactId} onChange={(e) => setContactId(e.target.value)}>
            <option value="">Choose a contact…</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName ?? ""} — {c.email}
              </option>
            ))}
          </Select>
        </div>
        {templates.length > 0 && (
          <div>
            <Label>Start from a template (optional)</Label>
            <Select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">Blank</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div>
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <Label>Body</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} />
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={scheduleLater} onChange={(e) => setScheduleLater(e.target.checked)} id="schedule-later" className="h-4 w-4 rounded border-navy-200" />
          <Label htmlFor="schedule-later" className="mb-0 cursor-pointer">
            Schedule for later
          </Label>
        </div>
        {scheduleLater && (
          <div>
            <Label>Send at</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
        )}
      </div>
    </Dialog>
  );
}
