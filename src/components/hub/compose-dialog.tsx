"use client";

import * as React from "react";
import { IconCopy, IconBrandWhatsapp, IconMail, IconCheck, IconX } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";

export interface ComposeTarget {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface ComposeDialogProps {
  onClose: () => void;
  kicker: string;
  title: string;
  to: ComposeTarget;
  /** Tone label -> starting message text. First entry is the default tone. */
  tones: Record<string, string>;
  sentLabel?: string;
  onSent: () => void | Promise<void>;
}

/** The reminder/follow-up/nudge message composer: editable text, WhatsApp and
 * email links built from it, Copy, and a "mark as sent"-style action --
 * reused across Quotes, Invoices and Projects rather than rebuilt per screen.
 *
 * Mount this only while it should be open (`{open && <ComposeDialog ... />}`)
 * rather than passing an `open` prop -- a fresh mount is what resets the
 * tone/text state to the new target each time, with no reset-on-open effect. */
export function ComposeDialog({ onClose, kicker, title, to, tones, sentLabel = "Mark as sent", onSent }: ComposeDialogProps) {
  const toast = useHubToast();
  const toneKeys = React.useMemo(() => Object.keys(tones), [tones]);
  const [tone, setTone] = React.useState(toneKeys[0]);
  const [text, setText] = React.useState(tones[toneKeys[0]!] ?? "");
  const [sending, setSending] = React.useState(false);

  function pickTone(t: string) {
    setTone(t);
    setText(tones[t] ?? "");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.show("Copied to clipboard");
    } catch {
      toast.show("Couldn't copy", "error");
    }
  }

  async function markSent() {
    setSending(true);
    try {
      await onSent();
      onClose();
    } catch {
      toast.show("Couldn't save", "error");
    } finally {
      setSending(false);
    }
  }

  const waHref = to.phone ? `https://wa.me/${to.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}` : undefined;
  const mailHref = to.email ? `mailto:${to.email}?subject=${encodeURIComponent("Click & Co")}&body=${encodeURIComponent(text)}` : undefined;

  return (
    <HubDialog open onClose={onClose}>
      <div className="dlg-head">
        <div>
          <small>{kicker}</small>
          <h2>{title}</h2>
        </div>
        <button className="icon-btn sm" onClick={onClose} aria-label="Close">
          <IconX className="i sm" stroke={1.75} />
        </button>
      </div>
      <div className="dlg-body">
        {toneKeys.length > 1 && (
          <div className="chips" role="group" aria-label="Tone">
            {toneKeys.map((t) => (
              <button key={t} type="button" className="chip" aria-pressed={tone === t} onClick={() => pickTone(t)}>
                {t[0]!.toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        )}
        <label className="field">
          <span>Message to {to.name}</span>
          <textarea className="input" rows={8} value={text} onChange={(e) => setText(e.target.value)} />
          <small>Edit freely. Copy it, or open it in WhatsApp or email.</small>
        </label>
        <div className="grid-2" style={{ fontSize: 14, color: "var(--ink-2)" }}>
          <div>
            <b>WhatsApp</b>
            <br />
            <span className="num">{to.phone || "—"}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <b>Email</b>
            <br />
            <span className="ellip" style={{ display: "block" }}>
              {to.email || "—"}
            </span>
          </div>
        </div>
      </div>
      <div className="dlg-foot">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary" onClick={copy}>
            <IconCopy className="i sm" stroke={1.75} /> Copy
          </button>
          <a className="btn btn-secondary" target="_blank" rel="noopener" href={waHref} aria-disabled={!waHref}>
            <IconBrandWhatsapp className="i sm" stroke={1.75} /> WhatsApp
          </a>
          <a className="btn btn-secondary" target="_blank" rel="noopener" href={mailHref} aria-disabled={!mailHref}>
            <IconMail className="i sm" stroke={1.75} /> Email
          </a>
        </div>
        <div className="r">
          <button type="button" className="btn btn-primary" onClick={markSent} disabled={sending}>
            <IconCheck className="i sm" stroke={1.75} /> {sentLabel}
          </button>
        </div>
      </div>
    </HubDialog>
  );
}
