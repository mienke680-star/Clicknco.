"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Building2, MapPin, Tag as TagIcon, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { apiPost, ApiError } from "@/lib/api-client";
import { formatDate, formatDateTime, timeAgo, formatCurrency, cn } from "@/lib/utils";
import { describeAuditAction } from "@/lib/audit-format";

interface ContactDetailProps {
  contact: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    address: string | null;
    leadSource: string | null;
    status: string | null;
    createdAt: string | Date;
    tags: { tag: { id: string; name: string; color: string } }[];
    notes: { id: string; body: string; createdAt: string | Date; author: { name: string } | null }[];
    customFieldValues: { value: string; customField: { label: string } }[];
    assignedUser: { name: string } | null;
    tasks: { id: string; title: string; status: string; dueDate: string | Date | null }[];
    pipelineCards: { id: string; title: string; value: unknown; pipeline: { name: string }; stage: { name: string } }[];
    formSubmissions: { id: string; createdAt: string | Date; form: { name: string } }[];
  };
  activity: { id: string; action: string; createdAt: string | Date; actor: { name: string } | null }[];
  allTags: { id: string; name: string; color: string }[];
  users: { id: string; name: string }[];
  canEdit: boolean;
  canDelete: boolean;
}

export function ContactDetailClient({ contact, activity, canEdit }: ContactDetailProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(contact.notes);
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  async function submitNote() {
    if (!noteBody.trim()) return;
    setSavingNote(true);
    try {
      const res = await apiPost<{ note: (typeof notes)[number] }>(`/api/contacts/${contact.id}/notes`, { body: noteBody });
      setNotes((prev) => [res.note, ...prev]);
      setNoteBody("");
    } catch (err) {
      toast({ title: "Couldn't save note", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSavingNote(false);
    }
  }

  const fullName = `${contact.firstName} ${contact.lastName ?? ""}`.trim();

  return (
    <div>
      <Link href="/portal/contacts" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-400 hover:text-navy-700">
        <ArrowLeft className="h-4 w-4" /> Back to contacts
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar name={fullName} size={64} />
              <h1 className="mt-3 text-lg font-semibold text-navy-900">{fullName}</h1>
              {contact.status && <Badge className="mt-1.5">{contact.status}</Badge>}
            </div>
            <div className="mt-6 space-y-3 text-sm">
              {contact.email && (
                <div className="flex items-center gap-2.5 text-navy-600">
                  <Mail className="h-4 w-4 shrink-0 text-navy-300" />
                  <a href={`mailto:${contact.email}`} className="truncate hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2.5 text-navy-600">
                  <Phone className="h-4 w-4 shrink-0 text-navy-300" />
                  <a href={`tel:${contact.phone}`} className="hover:underline">
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-2.5 text-navy-600">
                  <Building2 className="h-4 w-4 shrink-0 text-navy-300" />
                  {contact.company}
                </div>
              )}
              {contact.address && (
                <div className="flex items-center gap-2.5 text-navy-600">
                  <MapPin className="h-4 w-4 shrink-0 text-navy-300" />
                  {contact.address}
                </div>
              )}
            </div>
            {contact.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {contact.tags.map((t) => (
                  <Badge key={t.tag.id} variant="neutral">
                    <TagIcon className="h-3 w-3" /> {t.tag.name}
                  </Badge>
                ))}
              </div>
            )}
            <dl className="mt-5 space-y-2 border-t border-navy-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-400">Lead source</dt>
                <dd className="text-navy-700">{contact.leadSource || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-400">Assigned to</dt>
                <dd className="text-navy-700">{contact.assignedUser?.name || "Unassigned"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-400">Created</dt>
                <dd className="text-navy-700">{formatDate(contact.createdAt)}</dd>
              </div>
              {contact.customFieldValues.map((v, i) => (
                <div key={i} className="flex justify-between">
                  <dt className="text-navy-400">{v.customField.label}</dt>
                  <dd className="text-navy-700">{v.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="forms">Forms</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="pt-4">
              {canEdit && (
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <Textarea
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      placeholder="Add a note about this contact…"
                      rows={3}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" onClick={submitNote} loading={savingNote} disabled={!noteBody.trim()}>
                        <Send className="h-3.5 w-3.5" /> Add note
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {notes.length === 0 ? (
                <EmptyState title="No notes yet" />
              ) : (
                <div className="space-y-3">
                  {notes.map((n) => (
                    <Card key={n.id}>
                      <CardContent className="p-4">
                        <p className="text-sm text-navy-700">{n.body}</p>
                        <p className="mt-2 text-xs text-navy-300">
                          {n.author?.name ?? "Unknown"} · {formatDateTime(n.createdAt)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="pt-4">
              {activity.length === 0 ? (
                <EmptyState title="No activity yet" />
              ) : (
                <ul className="space-y-3">
                  {activity.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 text-sm">
                      <Avatar name={a.actor?.name ?? "System"} size={28} />
                      <div>
                        <p className="text-navy-700">
                          <span className="font-medium text-navy-900">{a.actor?.name ?? "System"}</span> {describeAuditAction(a.action)}
                        </p>
                        <p className="text-xs text-navy-300">{timeAgo(a.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="pipeline" className="pt-4">
              {contact.pipelineCards.length === 0 ? (
                <EmptyState title="Not in any pipeline yet" />
              ) : (
                <div className="space-y-2">
                  {contact.pipelineCards.map((card) => (
                    <Card key={card.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium text-navy-900">{card.title}</p>
                          <p className="text-xs text-navy-400">
                            {card.pipeline.name} · {card.stage.name}
                          </p>
                        </div>
                        {card.value != null && (
                          <p className="font-semibold text-navy-900">{formatCurrency(Number(card.value))}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="pt-4">
              {contact.tasks.length === 0 ? (
                <EmptyState title="No tasks linked yet" />
              ) : (
                <div className="space-y-2">
                  {contact.tasks.map((t) => (
                    <Card key={t.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <p className={cn("font-medium text-navy-900", t.status === "COMPLETED" && "text-navy-400 line-through")}>{t.title}</p>
                        <div className="flex items-center gap-2">
                          {t.dueDate && <span className="text-xs text-navy-400">{formatDate(t.dueDate)}</span>}
                          <Badge variant={t.status === "COMPLETED" ? "success" : "neutral"}>{t.status.replace("_", " ")}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="forms" className="pt-4">
              {contact.formSubmissions.length === 0 ? (
                <EmptyState title="No form submissions yet" />
              ) : (
                <div className="space-y-2">
                  {contact.formSubmissions.map((s) => (
                    <Card key={s.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <p className="font-medium text-navy-900">{s.form.name}</p>
                        <span className="text-xs text-navy-400">{formatDateTime(s.createdAt)}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
