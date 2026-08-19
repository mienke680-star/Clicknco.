"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { IconPicker } from "@/components/ui/icon-picker";
import { PageSpinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { SiteContentForm, type SiteSettingsData } from "./site-content-form";
import { SimpleListEditor } from "./simple-list-editor";
import { LegalPagesEditor } from "./legal-pages-editor";

interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: string;
  sortOrder: number;
  active: boolean;
}
interface Industry {
  id: string;
  icon: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}
interface Example {
  id: string;
  title: string;
  industry: string | null;
  description: string;
  imageUrl: string | null;
  sortOrder: number;
  active: boolean;
}
interface Faq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  active: boolean;
}

export function SettingsClient() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettingsData | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [examples, setExamples] = useState<Example[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);

  useEffect(() => {
    const handle = setTimeout(async () => {
      try {
        const [s, f, ind, ex, fq] = await Promise.all([
          apiFetch<{ settings: SiteSettingsData }>("/api/admin/site"),
          apiFetch<{ features: Feature[] }>("/api/admin/site/features"),
          apiFetch<{ industries: Industry[] }>("/api/admin/site/industries"),
          apiFetch<{ examples: Example[] }>("/api/admin/site/examples"),
          apiFetch<{ faqs: Faq[] }>("/api/admin/site/faqs"),
        ]);
        setSettings(s.settings);
        setFeatures(f.features);
        setIndustries(ind.industries);
        setExamples(ex.examples);
        setFaqs(fq.faqs);
      } catch {
        toast({ title: "Couldn't load site settings", variant: "error" });
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !settings) return <PageSpinner />;

  return (
    <Tabs defaultValue="content">
      <TabsList>
        <TabsTrigger value="content">Site Content</TabsTrigger>
        <TabsTrigger value="features">Features</TabsTrigger>
        <TabsTrigger value="industries">Industries</TabsTrigger>
        <TabsTrigger value="examples">Systems We Build</TabsTrigger>
        <TabsTrigger value="faqs">FAQs</TabsTrigger>
        <TabsTrigger value="legal">Legal Pages</TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="pt-6">
        <SiteContentForm settings={settings} onSaved={setSettings} />
      </TabsContent>

      <TabsContent value="features" className="pt-6">
        <SimpleListEditor<Feature>
          title="Features"
          itemLabel="Feature"
          apiPath="/api/admin/site/features"
          items={features}
          onChange={setFeatures}
          emptyItem={{ icon: "Sparkles", title: "", description: "", category: "core" }}
          isValid={(v) => Boolean(v.title?.trim() && v.description?.trim() && v.icon)}
          renderRow={(f) => (
            <div className="flex items-center gap-3">
              <DynamicIcon name={f.icon} className="h-4 w-4 text-navy-500" />
              <div>
                <p className="text-sm font-medium text-navy-900">{f.title}</p>
                <p className="text-xs text-navy-400">{f.description}</p>
              </div>
            </div>
          )}
          renderForm={(v, set) => (
            <>
              <div>
                <Label>Title</Label>
                <Input value={v.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={2} value={v.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
              </div>
              <div>
                <Label>Icon</Label>
                <IconPicker value={v.icon ?? "Sparkles"} onChange={(icon) => set({ icon })} />
              </div>
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="industries" className="pt-6">
        <SimpleListEditor<Industry>
          title="Industries"
          itemLabel="Industry"
          apiPath="/api/admin/site/industries"
          items={industries}
          onChange={setIndustries}
          emptyItem={{ icon: "Building2", name: "", description: "" }}
          isValid={(v) => Boolean(v.name?.trim() && v.icon)}
          renderRow={(ind) => (
            <div className="flex items-center gap-3">
              <DynamicIcon name={ind.icon} className="h-4 w-4 text-navy-500" />
              <p className="text-sm font-medium text-navy-900">{ind.name}</p>
            </div>
          )}
          renderForm={(v, set) => (
            <>
              <div>
                <Label>Name</Label>
                <Input value={v.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea rows={2} value={v.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
              </div>
              <div>
                <Label>Icon</Label>
                <IconPicker value={v.icon ?? "Building2"} onChange={(icon) => set({ icon })} />
              </div>
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="examples" className="pt-6">
        <SimpleListEditor<Example>
          title="Systems We Build"
          itemLabel="Example"
          apiPath="/api/admin/site/examples"
          items={examples}
          onChange={setExamples}
          emptyItem={{ title: "", industry: "", description: "" }}
          isValid={(v) => Boolean(v.title?.trim() && v.description?.trim())}
          renderRow={(ex) => (
            <div>
              <p className="text-sm font-medium text-navy-900">
                {ex.title} {ex.industry && <span className="text-xs font-normal text-navy-400">· {ex.industry}</span>}
              </p>
              <p className="text-xs text-navy-400">{ex.description}</p>
            </div>
          )}
          renderForm={(v, set) => (
            <>
              <div>
                <Label>Title</Label>
                <Input value={v.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="Real Estate CRM" />
              </div>
              <div>
                <Label>Industry (optional)</Label>
                <Input value={v.industry ?? ""} onChange={(e) => set({ industry: e.target.value })} placeholder="Real Estate" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={v.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
              </div>
              <div>
                <Label>Image URL (optional)</Label>
                <Input value={v.imageUrl ?? ""} onChange={(e) => set({ imageUrl: e.target.value })} />
              </div>
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="faqs" className="pt-6">
        <SimpleListEditor<Faq>
          title="FAQs"
          itemLabel="FAQ"
          apiPath="/api/admin/site/faqs"
          items={faqs}
          onChange={setFaqs}
          emptyItem={{ question: "", answer: "" }}
          isValid={(v) => Boolean(v.question?.trim() && v.answer?.trim())}
          renderRow={(f) => (
            <div>
              <p className="text-sm font-medium text-navy-900">{f.question}</p>
              <p className="line-clamp-2 text-xs text-navy-400">{f.answer}</p>
            </div>
          )}
          renderForm={(v, set) => (
            <>
              <div>
                <Label>Question</Label>
                <Input value={v.question ?? ""} onChange={(e) => set({ question: e.target.value })} />
              </div>
              <div>
                <Label>Answer</Label>
                <Textarea rows={4} value={v.answer ?? ""} onChange={(e) => set({ answer: e.target.value })} />
              </div>
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="legal" className="pt-6">
        <LegalPagesEditor />
      </TabsContent>
    </Tabs>
  );
}
