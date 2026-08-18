"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Switch, FieldHint } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { apiPatch, ApiError } from "@/lib/api-client";

interface Cta {
  label: string;
  href: string;
}
interface NavItem {
  label: string;
  href: string;
}
interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
}
export interface SiteSettingsData {
  brand: { name: string; tagline?: string; logoUrl?: string | null; faviconUrl?: string | null };
  hero: { headline: string; subheadline: string; primaryCta: Cta; secondaryCta: Cta };
  footer: { text?: string; columns?: unknown };
  announcementBar: { enabled: boolean; text?: string; linkUrl?: string; linkLabel?: string };
  seoDefaults: { title: string; description: string; ogImageUrl?: string | null };
  navigation: NavItem[];
  howItWorks: HowItWorksStep[];
}

export function SiteContentForm({ settings, onSaved }: { settings: SiteSettingsData; onSaved: (s: SiteSettingsData) => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [brand, setBrand] = useState(settings.brand);
  const [hero, setHero] = useState(settings.hero);
  const [footerText, setFooterText] = useState(settings.footer.text ?? "");
  const [announcement, setAnnouncement] = useState(settings.announcementBar);
  const [seo, setSeo] = useState(settings.seoDefaults);
  const [navigation, setNavigation] = useState<NavItem[]>(settings.navigation);
  const [howItWorks, setHowItWorks] = useState<HowItWorksStep[]>(settings.howItWorks);

  async function save() {
    setSaving(true);
    try {
      const res = await apiPatch<{ settings: Record<string, unknown> }>("/api/admin/site", {
        brand,
        hero,
        footer: { text: footerText },
        announcementBar: announcement,
        seoDefaults: seo,
        navigation,
        howItWorks,
      });
      onSaved(res.settings as unknown as SiteSettingsData);
      toast({ title: "Site content saved", description: "Live on the public site now.", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't save", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5">
          <p className="text-sm font-semibold text-navy-900">Brand</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} />
            </div>
            <div>
              <Label>Tagline</Label>
              <Input value={brand.tagline ?? ""} onChange={(e) => setBrand({ ...brand, tagline: e.target.value })} />
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input value={brand.logoUrl ?? ""} onChange={(e) => setBrand({ ...brand, logoUrl: e.target.value })} />
            </div>
            <div>
              <Label>Favicon URL</Label>
              <Input value={brand.faviconUrl ?? ""} onChange={(e) => setBrand({ ...brand, faviconUrl: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <p className="text-sm font-semibold text-navy-900">Hero</p>
          <div>
            <Label>Headline</Label>
            <Textarea rows={2} value={hero.headline} onChange={(e) => setHero({ ...hero, headline: e.target.value })} />
          </div>
          <div>
            <Label>Subheadline</Label>
            <Textarea rows={3} value={hero.subheadline} onChange={(e) => setHero({ ...hero, subheadline: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-navy-100 p-3">
              <Label>Primary button label</Label>
              <Input value={hero.primaryCta.label} onChange={(e) => setHero({ ...hero, primaryCta: { ...hero.primaryCta, label: e.target.value } })} />
              <Label>Primary button link</Label>
              <Input value={hero.primaryCta.href} onChange={(e) => setHero({ ...hero, primaryCta: { ...hero.primaryCta, href: e.target.value } })} />
            </div>
            <div className="space-y-2 rounded-xl border border-navy-100 p-3">
              <Label>Secondary button label</Label>
              <Input value={hero.secondaryCta.label} onChange={(e) => setHero({ ...hero, secondaryCta: { ...hero.secondaryCta, label: e.target.value } })} />
              <Label>Secondary button link</Label>
              <Input value={hero.secondaryCta.href} onChange={(e) => setHero({ ...hero, secondaryCta: { ...hero.secondaryCta, href: e.target.value } })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={announcement.enabled} onCheckedChange={(v) => setAnnouncement({ ...announcement, enabled: v })} />
            <p className="text-sm font-semibold text-navy-900">Announcement bar</p>
          </div>
          {announcement.enabled && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <Label>Text</Label>
                <Input value={announcement.text ?? ""} onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })} />
              </div>
              <div>
                <Label>Link label</Label>
                <Input value={announcement.linkLabel ?? ""} onChange={(e) => setAnnouncement({ ...announcement, linkLabel: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Link URL</Label>
                <Input value={announcement.linkUrl ?? ""} onChange={(e) => setAnnouncement({ ...announcement, linkUrl: e.target.value })} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <p className="text-sm font-semibold text-navy-900">Navigation</p>
          <RowsEditor
            rows={navigation}
            onChange={setNavigation}
            empty={{ label: "", href: "" }}
            renderFields={(row, update) => (
              <>
                <Input value={row.label} onChange={(e) => update({ label: e.target.value })} placeholder="Label" className="flex-1" />
                <Input value={row.href} onChange={(e) => update({ href: e.target.value })} placeholder="#section or /path" className="flex-1" />
              </>
            )}
            addLabel="Add nav link"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <p className="text-sm font-semibold text-navy-900">How It Works</p>
          <RowsEditor
            rows={howItWorks}
            onChange={setHowItWorks}
            empty={{ step: howItWorks.length + 1, title: "", description: "" }}
            renderFields={(row, update) => (
              <>
                <Input
                  type="number"
                  value={row.step}
                  onChange={(e) => update({ step: Number(e.target.value) })}
                  className="w-16 shrink-0"
                />
                <Input value={row.title} onChange={(e) => update({ title: e.target.value })} placeholder="Step title" className="flex-1" />
                <Input value={row.description} onChange={(e) => update({ description: e.target.value })} placeholder="Description" className="flex-[2]" />
              </>
            )}
            addLabel="Add step"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <p className="text-sm font-semibold text-navy-900">Footer & SEO</p>
          <div>
            <Label>Footer blurb</Label>
            <Textarea rows={2} value={footerText} onChange={(e) => setFooterText(e.target.value)} />
          </div>
          <div>
            <Label>SEO title</Label>
            <Input value={seo.title} onChange={(e) => setSeo({ ...seo, title: e.target.value })} />
          </div>
          <div>
            <Label>SEO description</Label>
            <Textarea rows={2} value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} />
          </div>
          <div>
            <Label>Social share image URL</Label>
            <Input value={seo.ogImageUrl ?? ""} onChange={(e) => setSeo({ ...seo, ogImageUrl: e.target.value })} />
          </div>
          <FieldHint>Footer link columns stay fixed for now — only this blurb is editable here.</FieldHint>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={save} loading={saving}>
          Save Site Content
        </Button>
      </div>
    </div>
  );
}

function RowsEditor<T>({
  rows,
  onChange,
  empty,
  renderFields,
  addLabel,
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  empty: T;
  renderFields: (row: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  addLabel: string;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          {renderFields(row, (patch) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))))}
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            className="shrink-0 cursor-pointer text-navy-300 hover:text-danger"
            aria-label="Remove row"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, empty])}>
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}
