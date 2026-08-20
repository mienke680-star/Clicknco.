"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Building2, Palette, CreditCard, ClipboardCheck, Upload } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiError } from "@/lib/api-client";
import { slugify, isValidEmail, cn } from "@/lib/utils";

interface UploadedFile {
  url: string;
}

const FALLBACK_TIMEZONES = [
  "UTC", "Africa/Johannesburg", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Sao_Paulo", "Europe/London", "Europe/Berlin", "Europe/Paris", "Europe/Madrid", "Africa/Cairo",
  "Africa/Lagos", "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka", "Asia/Bangkok", "Asia/Singapore",
  "Asia/Hong_Kong", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney", "Australia/Perth", "Pacific/Auckland",
];

function timezoneOptions() {
  try {
    if (typeof Intl.supportedValuesOf === "function") return Intl.supportedValuesOf("timeZone");
  } catch {
    // fall through to the static list below
  }
  return FALLBACK_TIMEZONES;
}

const FONT_OPTIONS = ["Plus Jakarta Sans", "Inter", "Poppins", "Manrope", "Sora", "DM Sans", "Work Sans", "Outfit"];
const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "ZAR", "AUD", "CAD"];

const STEPS = [
  { key: "details", label: "Details", icon: Building2 },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "package", label: "Package & Team", icon: CreditCard },
  { key: "review", label: "Review", icon: ClipboardCheck },
] as const;

interface FormState {
  name: string;
  subdomain: string;
  subdomainTouched: boolean;
  industry: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  timezone: string;
  notes: string;

  logoUrl: string;
  faviconUrl: string;
  brandPrimaryColor: string;
  brandAccentColor: string;
  brandFont: string;
  portalName: string;
  portalNameTouched: boolean;
  loginHeadline: string;

  packageName: string;
  setupFee: string;
  monthlyFee: string;
  currency: string;

  adminName: string;
  adminEmail: string;
}

const INITIAL_STATE: FormState = {
  name: "",
  subdomain: "",
  subdomainTouched: false,
  industry: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  timezone: "UTC",
  notes: "",

  logoUrl: "",
  faviconUrl: "",
  brandPrimaryColor: "#FF7657",
  brandAccentColor: "#64CFC8",
  brandFont: "Plus Jakarta Sans",
  portalName: "",
  portalNameTouched: false,
  loginHeadline: "",

  packageName: "",
  setupFee: "",
  monthlyFee: "",
  currency: "USD",

  adminName: "",
  adminEmail: "",
};

export function NewCompanyWizard() {
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const timezones = useMemo(() => timezoneOptions(), []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadImage(field: "logoUrl" | "faviconUrl", file: File, setUploading: (v: boolean) => void) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await apiFetch<{ file: UploadedFile }>("/api/admin/uploads", { method: "POST", body });
      set(field, res.file.url);
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setUploading(false);
    }
  }

  function onNameChange(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      subdomain: prev.subdomainTouched ? prev.subdomain : slugify(value),
      portalName: prev.portalNameTouched ? prev.portalName : value,
    }));
  }

  const detailsValid = form.name.trim().length >= 2 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.subdomain) && form.subdomain.length >= 2;
  const teamValid = Boolean(form.adminEmail) === Boolean(form.adminName) && (!form.adminEmail || isValidEmail(form.adminEmail));

  function canAdvance(index: number) {
    if (index === 0) return detailsValid;
    if (index === 2) return teamValid;
    return true;
  }

  function goNext() {
    if (!canAdvance(step)) return;
    setError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  async function submit() {
    if (!detailsValid || !teamValid) return;
    setSubmitting(true);
    setError(null);
    try {
      const { company } = await apiFetch<{ company: { id: string } }>("/api/admin/companies", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          subdomain: form.subdomain,
          industry: form.industry,
          contactPerson: form.contactPerson,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          website: form.website,
          timezone: form.timezone,
          notes: form.notes,
          logoUrl: form.logoUrl,
          faviconUrl: form.faviconUrl,
          brandPrimaryColor: form.brandPrimaryColor,
          brandAccentColor: form.brandAccentColor,
          brandFont: form.brandFont,
          portalName: form.portalName,
          loginHeadline: form.loginHeadline,
          packageName: form.packageName,
          setupFee: form.setupFee,
          monthlyFee: form.monthlyFee,
          currency: form.currency,
          adminName: form.adminName,
          adminEmail: form.adminEmail,
        }),
      });
      toast({ title: `${form.name} created`, description: "Default modules, pipeline, and dashboard are ready to customize.", variant: "success" });
      router.push(`/admin/companies/${company.id}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't create the company. Try again.";
      setError(message);
      if (message.toLowerCase().includes("subdomain")) setStep(0);
      else if (message.toLowerCase().includes("admin email")) setStep(2);
      toast({ title: "Couldn't create company", description: message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-navy-900 sm:text-2xl">Create Company</h1>
        <p className="mt-1 text-sm text-navy-400">Set the essentials now — you&apos;ll shape modules, dashboards, and navigation in Build Mode after launch.</p>
      </div>

      <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => (i < step || canAdvance(step) ? setStep(i) : undefined)}
            disabled={i > step && !canAdvance(step)}
            className={cn(
              "flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              i === step ? "border-navy-900 bg-navy-900 text-white" : i < step ? "border-aqua-300 bg-aqua-50 text-aqua-800" : "border-navy-200 text-navy-500",
            )}
          >
            {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
            {s.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="danger">{error}</Alert>
        </div>
      )}

      <Card className="p-6">
        {step === 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Company name</Label>
              <Input value={form.name} onChange={(e) => onNameChange(e.target.value)} placeholder="Riverstone Properties" autoFocus />
            </div>
            <div>
              <Label>Subdomain</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.subdomain}
                  onChange={(e) => setForm((prev) => ({ ...prev, subdomain: slugify(e.target.value), subdomainTouched: true }))}
                  placeholder="riverstone-properties"
                  aria-invalid={form.subdomain.length > 0 && !detailsValid}
                />
              </div>
              <FieldHint>Used for this company&apos;s portal URL and internal references.</FieldHint>
            </div>
            <div>
              <Label>Industry</Label>
              <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Real estate" />
            </div>
            <div>
              <Label>Primary contact name</Label>
              <Input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} placeholder="Jordan Lee" />
            </div>
            <div>
              <Label>Contact phone</Label>
              <Input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="+1 555 0100" />
            </div>
            <div>
              <Label>Contact email</Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="jordan@riverstone.com" />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://riverstone.com" />
            </div>
            <div className="sm:col-span-2">
              <Label>Timezone</Label>
              <Select value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Private notes</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything about this account only you should see." />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label>Logo</Label>
                <div className="flex gap-2">
                  <Input value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…/logo.png" />
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage("logoUrl", file, setUploadingLogo);
                      e.target.value = "";
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} loading={uploadingLogo}>
                    <Upload className="h-4 w-4" /> Upload
                  </Button>
                </div>
              </div>
              <div>
                <Label>Favicon</Label>
                <div className="flex gap-2">
                  <Input value={form.faviconUrl} onChange={(e) => set("faviconUrl", e.target.value)} placeholder="https://…/favicon.png" />
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage("faviconUrl", file, setUploadingFavicon);
                      e.target.value = "";
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => faviconInputRef.current?.click()} loading={uploadingFavicon}>
                    <Upload className="h-4 w-4" /> Upload
                  </Button>
                </div>
              </div>
              <ColorField label="Primary color" value={form.brandPrimaryColor} onChange={(v) => set("brandPrimaryColor", v)} />
              <ColorField label="Accent color" value={form.brandAccentColor} onChange={(v) => set("brandAccentColor", v)} />
              <div>
                <Label>Font</Label>
                <Select value={form.brandFont} onChange={(e) => set("brandFont", e.target.value)}>
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Portal name</Label>
                <Input
                  value={form.portalName}
                  onChange={(e) => setForm((prev) => ({ ...prev, portalName: e.target.value, portalNameTouched: true }))}
                  placeholder="Shown instead of “Click & Co” in their portal"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Login screen headline</Label>
                <Input value={form.loginHeadline} onChange={(e) => set("loginHeadline", e.target.value)} placeholder="Welcome back to Riverstone" />
              </div>
            </div>

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
                  <span className="text-sm font-semibold text-white">{form.portalName || form.name || "Company Portal"}</span>
                </div>
                <div className="space-y-3 bg-white p-4">
                  <p className="text-sm font-medium text-navy-900">{form.loginHeadline || "Welcome back"}</p>
                  <div className="h-8 rounded-lg border border-navy-100" />
                  <div className="h-8 rounded-lg border border-navy-100" />
                  <div className="h-8 rounded-lg text-center text-xs font-semibold leading-8 text-white" style={{ backgroundColor: form.brandAccentColor }}>
                    Sign in
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-navy-400">Font selected: {form.brandFont}</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div>
              <p className="mb-4 text-sm font-semibold text-navy-900">Package & billing</p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Label>Package name</Label>
                  <Input value={form.packageName} onChange={(e) => set("packageName", e.target.value)} placeholder="Growth Plan" />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Setup fee</Label>
                  <Input type="number" min="0" step="0.01" value={form.setupFee} onChange={(e) => set("setupFee", e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label>Monthly fee</Label>
                  <Input type="number" min="0" step="0.01" value={form.monthlyFee} onChange={(e) => set("monthlyFee", e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <FieldHint>Billing here stays manual and Super-Admin-controlled — nothing self-service. Add ledger entries any time from the company page.</FieldHint>
            </div>

            <div>
              <p className="mb-4 text-sm font-semibold text-navy-900">First Company Admin (optional)</p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Label>Full name</Label>
                  <Input value={form.adminName} onChange={(e) => set("adminName", e.target.value)} placeholder="Jordan Lee" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => set("adminEmail", e.target.value)}
                    placeholder="jordan@riverstone.com"
                    aria-invalid={Boolean(form.adminEmail) && !isValidEmail(form.adminEmail)}
                  />
                </div>
              </div>
              <FieldHint>
                They&apos;ll get an email to set their password and log in as Company Admin. Leave blank and invite people later from the Team tab.
              </FieldHint>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <ReviewSection title="Details">
              <ReviewRow label="Name" value={form.name} />
              <ReviewRow label="Subdomain" value={form.subdomain} />
              <ReviewRow label="Industry" value={form.industry || "—"} />
              <ReviewRow label="Contact" value={[form.contactPerson, form.contactEmail, form.contactPhone].filter(Boolean).join(" · ") || "—"} />
              <ReviewRow label="Timezone" value={form.timezone} />
            </ReviewSection>
            <ReviewSection title="Branding">
              <ReviewRow label="Portal name" value={form.portalName || form.name} />
              <ReviewRow
                label="Colors"
                value={
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border border-navy-100" style={{ backgroundColor: form.brandPrimaryColor }} />
                    {form.brandPrimaryColor}
                    <span className="h-4 w-4 rounded-full border border-navy-100" style={{ backgroundColor: form.brandAccentColor }} />
                    {form.brandAccentColor}
                  </span>
                }
              />
              <ReviewRow label="Font" value={form.brandFont} />
            </ReviewSection>
            <ReviewSection title="Package">
              <ReviewRow label="Package" value={form.packageName || "—"} />
              <ReviewRow label="Fees" value={`${form.setupFee || "0"} setup · ${form.monthlyFee || "0"}/mo ${form.currency}`} />
            </ReviewSection>
            <ReviewSection title="Team">
              <ReviewRow
                label="First admin"
                value={form.adminEmail ? `${form.adminName} <${form.adminEmail}> will be emailed an invite` : "None — add people later"}
              />
            </ReviewSection>
          </div>
        )}
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <div>
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <LinkButton variant="outline" href="/admin/companies">
              Cancel
            </LinkButton>
          )}
        </div>
        {step < STEPS.length - 1 ? (
          <Button onClick={goNext} disabled={!canAdvance(step)}>
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={submit} loading={submitting}>
            Create Company
          </Button>
        )}
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-navy-200 bg-white p-1"
          aria-label={label}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#FF7657" />
      </div>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">{title}</p>
      <div className="divide-y divide-navy-50 rounded-xl border border-navy-100">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
      <span className="text-navy-400">{label}</span>
      <span className="text-right font-medium text-navy-800">{value}</span>
    </div>
  );
}
