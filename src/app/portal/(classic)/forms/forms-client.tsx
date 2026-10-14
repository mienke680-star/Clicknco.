"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, Trash2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/table";
import { PageSpinner, SectionHeading } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPost, apiDelete, ApiError } from "@/lib/api-client";

interface FormRow {
  id: string;
  name: string;
  targetModuleKey: string | null;
  createdAt: string;
  _count: { submissions: number };
}

export function FormsClient() {
  const { toast } = useToast();
  const router = useRouter();
  const [forms, setForms] = useState<FormRow[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function load() {
    try {
      const res = await apiFetch<{ forms: FormRow[] }>("/api/forms");
      setForms(res.forms);
    } catch {
      toast({ title: "Couldn't load forms", variant: "error" });
    }
  }

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function removeForm(f: FormRow) {
    if (!confirm(`Delete "${f.name}"? Its submission history will be deleted too — this can't be undone.`)) return;
    try {
      await apiDelete(`/api/forms/${f.id}`);
      toast({ title: "Form deleted", variant: "success" });
      setForms((prev) => prev?.filter((x) => x.id !== f.id) ?? null);
    } catch (err) {
      toast({ title: "Couldn't delete form", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    }
  }

  function copyLink(id: string) {
    const url = `${window.location.origin}/f/${id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied", description: url, variant: "success" });
  }

  return (
    <div>
      <SectionHeading
        title="Forms"
        description="Build forms that route submissions straight into your contacts and pipelines."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> New Form
          </Button>
        }
      />

      {forms === null ? (
        <PageSpinner />
      ) : forms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title="No forms yet"
            description="Create a form, add fields, and share its public link — submissions land as new contacts automatically."
            action={<Button onClick={() => setDialogOpen(true)}>Create your first form</Button>}
          />
        </Card>
      ) : (
        <Card className="divide-y divide-navy-50">
          {forms.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-peach text-coral-600">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/portal/forms/${f.id}`} className="truncate text-sm font-semibold text-navy-900 hover:underline">
                  {f.name}
                </Link>
                <p className="truncate text-xs text-navy-400">
                  {f._count.submissions} submission{f._count.submissions === 1 ? "" : "s"} · routes to {f.targetModuleKey && f.targetModuleKey !== "contacts" ? f.targetModuleKey : "Contacts"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => copyLink(f.id)}>
                <LinkIcon className="h-3.5 w-3.5" /> Copy link
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Delete ${f.name}`} onClick={() => removeForm(f)}>
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
          ))}
        </Card>
      )}

      <CreateFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(id) => router.push(`/portal/forms/${id}`)}
      />
    </div>
  );
}

function CreateFormDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (name.trim().length < 2) {
      toast({ title: "Enter a form name", variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiPost<{ form: { id: string } }>("/api/forms", {
        name,
        fields: [{ id: "name", type: "TEXT", label: "Name", required: true, mapsTo: "firstName" }],
        successAction: { type: "message", message: "Thanks — we'll be in touch." },
      });
      toast({ title: "Form created", variant: "success" });
      setName("");
      onCreated(res.form.id);
    } catch (err) {
      toast({ title: "Couldn't create form", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New Form"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            Create Form
          </Button>
        </>
      }
    >
      <div>
        <Label>Form name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Website Contact Form" autoFocus onKeyDown={(e) => e.key === "Enter" && submit()} />
      </div>
    </Dialog>
  );
}
