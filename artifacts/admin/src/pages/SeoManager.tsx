import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@workspace/ui";
import { Save, Search, Globe, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";
import { getErrorMessage } from "@/lib/error-messages";
import { cn } from "@/lib/utils";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Skeleton, Textarea } from "@workspace/ui";

type SeoData = { title: string; description: string; keywords: string; og_title: string; og_description: string; og_image: string; canonical_url: string; twitterCard: string; twitter_creator: string };
const DEFAULTS: SeoData = { title: "", description: "", keywords: "", og_title: "", og_description: "", og_image: "", canonical_url: "", twitterCard: "summary_large_image", twitter_creator: "" };

function CharCounter({ current, max, label }: { current: number; max: number; label: string }) {
  const over = current > max;
  const nearLimit = current > max * 0.9;

  return (
    <div className="flex items-center justify-between mt-1">
      <span className={cn(
        "text-xs",
        over ? "text-destructive font-semibold" :
        nearLimit ? "text-amber-600 dark:text-amber-400" :
        "text-muted-foreground"
      )}>
        {over
          ? `${current - max} characters over ${label} limit`
          : `${current}/${max}`
        }
      </span>
      {over && (
        <span className="text-xs text-destructive">
          Google will truncate this
        </span>
      )}
    </div>
  );
}

export default function SeoManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["seoSettings"],
    queryFn: async () => {
      const res = await api.seoSettings.get();
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
  });
  const [form, setForm] = useState<SeoData>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (data && !initialLoadDone.current) {
      initialLoadDone.current = true;
      setForm({
        title: data.title ?? "",
        description: data.description ?? "",
        keywords: data.keywords ?? "",
        og_title: data.og_title ?? "",
        og_description: data.og_description ?? "",
        og_image: data.og_image ?? "",
        canonical_url: data.canonical_url ?? "",
        twitterCard: data.twitter_card ?? "summary_large_image",
        twitter_creator: data.twitter_creator ?? "",
      });
    }
  }, [data]);

  const set = (k: keyof SeoData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (form.title.length > 60 || form.description.length > 160) {
      toast({ title: "Character limit exceeded", description: "Please reduce the title to 60 characters and description to 160 characters.", variant: "destructive" });
      return;
    }
    const urlPattern = /^https?:\/\/.+/; {/* FIX: UX-020 */}
    if (form.canonical_url && !urlPattern.test(form.canonical_url)) {
      toast({ title: "Invalid canonical URL", description: "Must start with http:// or https://", variant: "destructive" });
      return;
    }
    if (form.og_image && !urlPattern.test(form.og_image)) {
      toast({ title: "Invalid OG image URL", description: "Must start with http:// or https://", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await api.seoSettings.update({
        title: form.title,
        description: form.description,
        keywords: form.keywords,
        og_title: form.og_title,
        og_description: form.og_description,
        og_image: form.og_image || null,
        canonical_url: form.canonical_url,
        twitter_card: form.twitterCard,
        twitter_creator: form.twitter_creator || null,
      });
      if (!res.success) throw new Error(res.message);
      toast({ title: "SEO settings saved" });
      queryClient.invalidateQueries({ queryKey: ["seoSettings"] });
    } catch (err) { logError("Failed to save SEO settings", err, "SeoManager"); toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const isOverLimit = form.title.length > 60 || form.description.length > 160;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">{getErrorMessage(error)}</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">SEO Settings</h1><p className="text-sm text-muted-foreground mt-0.5">Meta tags, Open Graph, and Twitter card data.</p></div>
        <Button size="sm" onClick={handleSave} disabled={saving || isOverLimit} title={isOverLimit ? "Reduce character count before saving" : undefined} className="min-h-[44px]">
          {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Search size={14} /> Core Meta Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label className="text-xs">Page Title <span className="text-muted-foreground">(≤60 chars)</span></Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} className="h-9" />
            <CharCounter current={form.title.length} max={60} label="title" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Meta Description <span className="text-muted-foreground">(≤160 chars)</span></Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} />
            <CharCounter current={form.description.length} max={160} label="description" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Keywords <span className="text-muted-foreground">(comma-separated)</span></Label>
            <Input value={form.keywords} onChange={e => set("keywords", e.target.value)} className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Canonical URL</Label>
            <Input value={form.canonical_url} onChange={e => set("canonical_url", e.target.value)} className="h-9" placeholder="https://your-domain.replit.app" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Globe size={14} /> Open Graph (Social)</CardTitle>
          <CardDescription className="text-xs">Controls how your site appears when shared on LinkedIn, Facebook, etc.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label className="text-xs">OG Title</Label>
            <Input value={form.og_title} onChange={e => set("og_title", e.target.value)} className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs">OG Description</Label>
            <Textarea value={form.og_description} onChange={e => set("og_description", e.target.value)} rows={2} /></div>
          <div className="space-y-1.5"><Label className="text-xs">OG Image URL (optional)</Label>
            <Input value={form.og_image} onChange={e => set("og_image", e.target.value)} className="h-9" placeholder="https://…/og-image.png (1200×630)" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Twitter Card</Label>
              <Input value={form.twitterCard} onChange={e => set("twitterCard", e.target.value)} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">Twitter Creator</Label>
              <Input value={form.twitter_creator} onChange={e => set("twitter_creator", e.target.value)} className="h-9" placeholder="@handle" /></div>
          </div>
        </CardContent>
      </Card>

      {form.title && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Google Search Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-background p-4 space-y-1">
              <div className="text-blue-600 dark:text-blue-400 font-medium text-sm hover:underline cursor-pointer">{form.title || "Page Title"}</div>
              <div className="text-emerald-700 dark:text-emerald-500 text-xs">{form.canonical_url || "https://your-site.replit.app"}</div>
              <div className="text-muted-foreground text-xs leading-relaxed">{form.description || "Page description…"}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
