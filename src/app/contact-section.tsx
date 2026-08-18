"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { apiPost, ApiError } from "@/lib/api-client";

export function ContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiPost("/api/public/inquiries", { name, email, phone, company, message, website });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-navy-100 bg-white p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-aqua-100 text-aqua-700">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <p className="text-lg font-semibold text-navy-900">Thanks — we&apos;ve got it.</p>
        <p className="text-sm text-navy-400">We&apos;ll be in touch shortly to talk through what you need.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-4 rounded-2xl border border-navy-100 bg-white p-6 sm:p-8">
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
      >
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name">Full name</Label>
          <Input id="contact-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" />
        </div>
        <div>
          <Label htmlFor="contact-email">Email</Label>
          <Input id="contact-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@company.com" />
        </div>
        <div>
          <Label htmlFor="contact-phone">Phone (optional)</Label>
          <Input id="contact-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
        </div>
        <div>
          <Label htmlFor="contact-company">Company (optional)</Label>
          <Input id="contact-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your company" />
        </div>
      </div>
      <div>
        <Label htmlFor="contact-message">What do you need built?</Label>
        <Textarea id="contact-message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us a bit about your business and what you're hoping your system could do." />
      </div>
      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        Request Your System
      </Button>
      <p className="text-center text-xs text-navy-300">We reply personally — no automated sign-up, no spam.</p>
    </form>
  );
}
