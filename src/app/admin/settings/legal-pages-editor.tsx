"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldHint } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageSpinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPatch, ApiError } from "@/lib/api-client";

interface LegalPage {
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

export function LegalPagesEditor() {
  const [pages, setPages] = useState<Record<string, LegalPage>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = setTimeout(async () => {
      try {
        const [privacy, terms] = await Promise.all([
          apiFetch<{ page: LegalPage }>("/api/admin/site/legal/privacy"),
          apiFetch<{ page: LegalPage }>("/api/admin/site/legal/terms"),
        ]);
        setPages({ privacy: privacy.page, terms: terms.page });
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => clearTimeout(handle);
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <Tabs defaultValue="privacy">
      <TabsList>
        <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
        <TabsTrigger value="terms">Terms of Service</TabsTrigger>
      </TabsList>
      <TabsContent value="privacy" className="pt-6">
        {pages.privacy && <LegalPageForm page={pages.privacy} />}
      </TabsContent>
      <TabsContent value="terms" className="pt-6">
        {pages.terms && <LegalPageForm page={pages.terms} />}
      </TabsContent>
    </Tabs>
  );
}

function LegalPageForm({ page }: { page: LegalPage }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await apiPatch(`/api/admin/site/legal/${page.slug}`, { title, content });
      toast({ title: "Saved", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't save", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Content (HTML)</Label>
          <Textarea rows={14} value={content} onChange={(e) => setContent(e.target.value)} className="font-mono text-xs" />
          <FieldHint>Basic HTML (paragraphs, lists, links) — this renders as-is on the public legal page.</FieldHint>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
