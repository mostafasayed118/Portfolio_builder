import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, X, Image as ImageIcon, AlertCircle, RefreshCw } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getHeroContent, upsertHeroContent } from "@workspace/db/hero-content";
import { logError } from "@/lib/logger";

type HeroData = {
  heading: string; name: string; roles: string[]; description: string;
  githubUrl: string; linkedinUrl: string; email: string;
  available: boolean; cvFileName: string; isPublished: boolean;
};

const DEFAULTS: HeroData = {
  heading: "Hi, I'm", name: "Mustafa Sayed", roles: ["Data Engineer"],
  description: "", githubUrl: "", linkedinUrl: "", email: "",
  available: true, cvFileName: "Mustafa_Sayed_Resume.pdf", isPublished: true,
};

export default function HeroManager() {
  const { toast } = useToast();
  const { data: heroData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["heroContent"],
    queryFn: () => getHeroContent(getSupabase()),
    enabled: isSupabaseConfigured,
  });
  const [form, setForm] = useState<HeroData>(DEFAULTS);
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (heroData && !initialLoadDone.current) {
      initialLoadDone.current = true;
      setForm({
        heading: heroData.heading,
        name: heroData.name,
        roles: heroData.roles ?? [],
        description: heroData.description ?? "",
        githubUrl: heroData.github_url ?? "",
        linkedinUrl: heroData.linkedin_url ?? "",
        email: heroData.email ?? "",
        available: heroData.available ?? true,
        cvFileName: heroData.cv_file_name ?? "",
        isPublished: heroData.is_published ?? true,
      });
      setLastSaved(heroData.updated_at);
    }
  }, [heroData]);

  const set = (k: string, v: string | boolean | string[]) =>
    setForm(f => ({ ...f, [k]: v }));

  const addRole = () => {
    const r = newRole.trim();
    if (!r) return;
    if (!form.roles.includes(r)) { set("roles", [...form.roles, r]); setNewRole(""); }
  };

  const removeRole = (r: string) => set("roles", form.roles.filter(x => x !== r));

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertHeroContent(getSupabase(), {
        heading: form.heading,
        name: form.name,
        roles: form.roles,
        description: form.description,
        github_url: form.githubUrl,
        linkedin_url: form.linkedinUrl,
        email: form.email,
        available: form.available,
        cv_file_name: form.cvFileName || null,
        is_published: form.isPublished,
      });
      setLastSaved(new Date().toISOString());
      toast({ title: "Hero saved" });
    } catch (err) { logError("Failed to save hero content", err, "HeroManager"); toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

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
        <p className="text-destructive font-medium">Failed to load data</p>
        <p className="text-muted-foreground text-sm">{error?.message}</p>
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
        <div>
          <h1 className="text-2xl font-bold">Hero Section</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Name, roles, bio links, availability status.</p>
          {lastSaved && (
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              Last saved: {new Date(lastSaved).toLocaleString()}
            </p>
          )}
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save size={14} className="mr-1.5" />{saving ? "Saving\u2026" : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Identity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Heading Prefix</Label>
              <Input value={form.heading} onChange={e => set("heading", e.target.value)} placeholder="Hi, I'm" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Mustafa Sayed" className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="Short bio shown in hero\u2026" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-1.5"><ImageIcon size={14} /> Avatar Image</CardTitle></CardHeader>
        <CardContent>
          <ImageUploader entityType="hero" maxFiles={1} maxFileSizeMB={2} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Typewriter Roles</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {form.roles.map(r => (
              <Badge key={r} variant="secondary" className="flex items-center gap-1.5 pr-1">
                {r}
                <button onClick={() => removeRole(r)} className="hover:text-destructive transition-colors">
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newRole} onChange={e => setNewRole(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addRole()}
              placeholder="Add role\u2026" className="h-8 text-sm flex-1" />
            <Button size="sm" variant="outline" onClick={addRole}><Plus size={14} /></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Links & Contact</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {([["githubUrl", "GitHub URL"], ["linkedinUrl", "LinkedIn URL"], ["email", "Email Address"], ["cvFileName", "CV File Name"]] as [keyof HeroData, string][]).map(([k, label]) => (
            <div key={k} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input value={form[k] as string} onChange={e => set(k, e.target.value)} className="h-8 text-sm" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Visibility</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {([["available", "Available for opportunities"], ["isPublished", "Section published"]] as [keyof HeroData, string][]).map(([k, label]) => (
            <div key={k} className="flex items-center justify-between">
              <Label className="text-sm">{label}</Label>
              <Switch checked={form[k] as boolean} onCheckedChange={v => set(k, v)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
