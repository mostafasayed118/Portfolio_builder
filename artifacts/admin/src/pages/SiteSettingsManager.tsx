import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/convex";
import { getSiteSettings, upsertSiteSettings } from "@workspace/db/site-settings";

type SiteData = { site_name: string; site_tagline: string; footer_text: string; copyright_text: string; logo_text: string; default_theme: "light" | "dark" };
const DEFAULTS: SiteData = { site_name: "Mustafa Sayed", site_tagline: "Data Engineer", footer_text: "", copyright_text: "", logo_text: "MS", default_theme: "dark" };

export default function SiteSettingsManager() {
  const { toast } = useToast();
  const { data } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: () => getSiteSettings(getSupabase()),
    enabled: isSupabaseConfigured,
  });
  const [form, setForm] = useState<SiteData>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({
      site_name: data.site_name ?? "",
      site_tagline: data.site_tagline ?? "",
      footer_text: data.footer_text ?? "",
      copyright_text: data.copyright_text ?? "",
      logo_text: data.logo_text ?? "",
      default_theme: data.default_theme ?? "dark",
    });
  }, [data]);

  const set = (k: keyof SiteData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { await upsertSiteSettings(getSupabase(), form); toast({ title: "Site settings saved" }); }
    catch (err) { console.error(err); toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Site Settings</h1><p className="text-sm text-muted-foreground mt-0.5">Name, tagline, footer, and defaults.</p></div>
        <Button size="sm" onClick={handleSave} disabled={saving}><Save size={14} className="mr-1.5" />{saving ? "Saving…" : "Save"}</Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Identity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {([["site_name", "Site Name"], ["site_tagline", "Tagline"], ["logo_text", "Logo Text (2 letters)"]] as [keyof SiteData, string][]).map(([k, label]) => (
            <div key={k} className="space-y-1.5"><Label className="text-xs">{label}</Label>
              <Input value={form[k]} onChange={e => set(k, e.target.value)} className="h-9" /></div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Footer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {([["footer_text", "Footer Text"], ["copyright_text", "Copyright Text"]] as [keyof SiteData, string][]).map(([k, label]) => (
            <div key={k} className="space-y-1.5"><Label className="text-xs">{label}</Label>
              <Input value={form[k]} onChange={e => set(k, e.target.value)} className="h-9" /></div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Defaults</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1.5"><Label className="text-xs">Default Theme Mode</Label>
            <Select value={form.default_theme} onValueChange={v => set("default_theme", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
