"use client";

import * as React from "react";
import { IconCheck } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";
import { apiPost, apiPatch } from "@/lib/api-client";
import type { ClientDTO } from "@/lib/clickco/client-calc";

// Hub lifecycle vocabulary -- matches what the quote-accept transaction
// writes (Retainer/Onboarding) and the status pill/filter logic elsewhere on
// this screen. Deliberately not the (classic) CRM's Lead/Customer/Inactive
// vocabulary -- per-company status vocabularies already coexist safely
// (see prisma/seed.ts's own seed data), and this one is what Click & Co uses.
const STATUSES = ["Lead", "Quoted", "Onboarding", "Active", "Retainer", "Complete"];

interface Tag {
  id: string;
  name: string;
  color: string;
}
interface UserOption {
  id: string;
  name: string;
}

export interface ClientFormDialogProps {
  onClose: () => void;
  client?: ClientDTO;
  tags: Tag[];
  users: UserOption[];
  onSaved: (client: ClientDTO) => void;
}

// Shape of the raw row POST /api/contacts and PATCH /api/contacts/[id]
// return -- Contact's own scalar fields, not the richer ClientDTO (no
// nested projects/quotes/invoices; those are carried over from the
// existing client below instead of re-fetched).
interface ApiContact {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string | null;
  clientNote: string | null;
  createdAt: Date;
}

/** Mount this only while it should be open -- see ComposeDialog for why. */
export function ClientFormDialog({ onClose, client, tags, users, onSaved }: ClientFormDialogProps) {
  const toast = useHubToast();
  const [firstName, setFirstName] = React.useState(client?.firstName ?? "");
  const [lastName, setLastName] = React.useState(client?.lastName ?? "");
  const [company, setCompany] = React.useState(client?.company ?? "");
  const [email, setEmail] = React.useState(client?.email ?? "");
  const [phone, setPhone] = React.useState(client?.phone ?? "");
  const [status, setStatus] = React.useState(client?.status ?? "Lead");
  const [address, setAddress] = React.useState("");
  const [leadSource, setLeadSource] = React.useState("");
  const [assignedUserId, setAssignedUserId] = React.useState("");
  const [tagIds, setTagIds] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  function toggleTag(id: string) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.show("Add the client's first name", "error");
      return;
    }
    setSaving(true);
    try {
      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        status,
        address: address.trim(),
        leadSource: leadSource.trim(),
        assignedUserId: assignedUserId || null,
        tagIds,
      };
      const result = client
        ? await apiPatch<{ contact: ApiContact }>(`/api/contacts/${client.id}`, body)
        : await apiPost<{ contact: ApiContact }>("/api/contacts", body);
      toast.show(client ? "Client updated" : "Client added");
      onSaved({ ...result.contact, projects: client?.projects ?? [], quotes: client?.quotes ?? [], invoices: client?.invoices ?? [] });
    } catch {
      toast.show("Couldn't save the client", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HubDialog open onClose={onClose}>
      <form style={{ display: "contents" }} onSubmit={save}>
        <div className="dlg-head">
          <div>
            <small>{client ? client.firstName : "Add a client"}</small>
            <h2>{client ? "Edit client" : "New client"}</h2>
          </div>
        </div>
        <div className="dlg-body">
          <div className="grid-2">
            <label className="field">
              <span>First name</span>
              <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus required />
            </label>
            <label className="field">
              <span>Last name</span>
              <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
          </div>
          <div className="grid-2">
            <label className="field">
              <span>Company</span>
              <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
            </label>
            <label className="field">
              <span>Status</span>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid-2">
            <label className="field">
              <span>WhatsApp number</span>
              <input className="input" inputMode="tel" placeholder="082 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="field">
              <span>Email</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>
          <div className="grid-2">
            <label className="field">
              <span>Address</span>
              <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
            <label className="field">
              <span>Lead source</span>
              <input className="input" placeholder="e.g. Referral, Website form" value={leadSource} onChange={(e) => setLeadSource(e.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>Assigned to</span>
            <select className="input" value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          {tags.length > 0 && (
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink-2)", marginBottom: 4 }}>Tags</legend>
              <div className="chips" role="group" aria-label="Tags">
                {tags.map((tag) => (
                  <button key={tag.id} type="button" className="chip" aria-pressed={tagIds.includes(tag.id)} onClick={() => toggleTag(tag.id)}>
                    {tag.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </div>
        <div className="dlg-foot">
          <span></span>
          <div className="r">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <IconCheck className="i sm" stroke={1.75} /> {client ? "Save changes" : "Save client"}
            </button>
          </div>
        </div>
      </form>
    </HubDialog>
  );
}
