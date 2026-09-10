import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useId } from "react";
import { useToast } from "@workspace/ui";
import { Save, Globe } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, RadioGroup, RadioGroupItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "@workspace/ui";
import { AdminErrorState } from "@/components/AdminErrorState";
import { AdminLoadingState } from "@/components/AdminLoadingState";
import { ArabicContentStatus } from "@/features/settings/components/ArabicStatus";

type LanguageMode = "en_only" | "ar_only" | "both";
type SiteData = { site_name: string; site_tagline: string; footer_text: string; copyright_text: string; logo_text: string; default_theme: "light" | "dark" };
const DEFAULTS: SiteData = { site_name: "Mustafa Sayed", site_tagline: "Data Engineer", footer_text: "", copyright_text: "", logo_text: "MS", default_theme: "dark" };
type LanguageForm = { language_mode: LanguageMode; default_language: "en" | "ar"; show_language_toggle: boolean; rtl_enabled: boolean };
const LANG_DEFAULTS: LanguageForm = { language_mode: "en_only", default_language: "en", show_language_toggle: false, rtl_enabled: false };

const TEXT_FIELDS: [keyof SiteData, string][] = [
  ["site_name", "Site Name"],
  ["site_tagline", "Tagline"],
  ["logo_text", "Logo Text (2 letters)"],
  ["footer_text", "Footer Text"],
  ["copyright_text", "Copyright Text"],
];

export default function SiteSettingsManager() {
  const formId = useId();
  const langFormId = useId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["siteSettings"], queryFn: async () => { const res = await api.siteSettings.get(); if (!res.success) throw new Error(res.message); return res.data; }, enabled: isSupabaseConfigured });
  const [form, setForm] = useState<SiteData>(DEFAULTS);
  const [langForm, setLangForm] = useState<LanguageForm>(LANG_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [savingLang, setSavingLang] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({ site_name: data.site_name ?? "", site_tagline: data.site_tagline ?? "", footer_text: data.footer_text ?? "", copyright_text: data.copyright_text ?? "", logo_text: data.logo_text ?? "", default_theme: data.default_theme ?? "dark" });
      setLangForm({ language_mode: (data.language_mode as LanguageMode) ?? "en_only", default_language: (data.default_language as "en" | "ar") ?? "en", show_language_toggle: data.show_language_toggle ?? false, rtl_enabled: data.rtl_enabled ?? false });
    }
  }, [data]);

  const set = (k: keyof SiteData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { const res = await api.siteSettings.update(form); if (!res.success) throw new Error(res.message); toast({ title: "Site settings saved" }); }
    catch (err) { logError("Failed to save site settings", err, "SiteSettingsManager"); toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleSaveLanguage = async () => {
    setSavingLang(true);
    try {
      const result = await api.siteSettings.updateLanguage(langForm);
      if (result.success) { toast({ title: "Language settings saved" }); queryClient.invalidateQueries({ queryKey: ["siteSettings"] }); }
      else { toast({ title: result.message ?? "Save failed", variant: "destructive" }); }
    } catch (err) { logError("Failed to save language settings", err, "SiteSettingsManager"); toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSavingLang(false); }
  };

  if (isLoading) return <AdminLoadingState />;
  if (isError) return <AdminErrorState title="Failed to load data" message={error?.message} onRetry={() => refetch()} iconClassName="h-10 w-10 text-destructive" contentClassName="text-center" messageClassName="text-sm text-muted-foreground mt-1" />;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Site Settings</h1><p className="text-sm text-muted-foreground mt-0.5">Name, tagline, footer, and localization.</p></div>
        <Button size="sm" onClick={handleSave} disabled={saving}><Save size={14} className="mr-1.5" />{saving ? "Saving..." : "Save"}</Button>
      </div>
      <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Identity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {TEXT_FIELDS.slice(0, 3).map(([k, label], i) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={`${formId}-${i}`} className="text-xs">{label}</Label>
              <Input id={`${formId}-${i}`} value={form[k]} onChange={e => set(k, e.target.value)} className="h-9" />
            </div>
          ))}
        </CardContent></Card>
      <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Footer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {TEXT_FIELDS.slice(3).map(([k, label], i) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={`${formId}-footer-${i}`} className="text-xs">{label}</Label>
              <Input id={`${formId}-footer-${i}`} value={form[k]} onChange={e => set(k, e.target.value)} className="h-9" />
            </div>
          ))}
        </CardContent></Card>
      <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Defaults</CardTitle></CardHeader>
        <CardContent><div className="space-y-1.5">
          <Label htmlFor={`${formId}-theme`} className="text-xs">Default Theme Mode</Label>
          <Select value={form.default_theme} onValueChange={v => set("default_theme", v)}>
            <SelectTrigger id={`${formId}-theme`} className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="light">Light</SelectItem><SelectItem value="dark">Dark</SelectItem></SelectContent>
          </Select>
        </div></CardContent></Card>
      <Card><CardHeader className="pb-3 flex flex-row items-center gap-2"><Globe className="h-4 w-4 text-primary" /><CardTitle className="text-sm">Language & Localization</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Language Mode</Label>
            <RadioGroup value={langForm.language_mode} onValueChange={(val) => setLangForm(prev => ({ ...prev, language_mode: val as LanguageMode }))} className="space-y-2">
              {[{ value: "en_only" as const, label: "English Only", desc: "Show portfolio in English only. Language toggle hidden.", flag: "\uD83C\uDDEC\uD83C\uDDE7" }, { value: "ar_only" as const, label: "Arabic Only", desc: "Show portfolio in Arabic only. RTL layout applied.", flag: "\uD83C\uDDF8\uD83C\uDDE6" }, { value: "both" as const, label: "Both Languages", desc: "Visitors can switch between English and Arabic.", flag: "\uD83C\uDF10" }].map(opt => (
                <div key={opt.value} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={opt.value} id={`${langFormId}-${opt.value}`} />
                  <Label htmlFor={`${langFormId}-${opt.value}`} className="cursor-pointer">
                    <span className="font-medium">{opt.flag} {opt.label}</span>
                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          {langForm.language_mode === "both" && (<>
            <div className="space-y-2">
              <Label htmlFor={`${langFormId}-default-lang`} className="text-xs font-semibold">Default Language</Label>
              <Select value={langForm.default_language} onValueChange={(val) => setLangForm(prev => ({ ...prev, default_language: val as "en" | "ar" }))}>
                <SelectTrigger id={`${langFormId}-default-lang`} className="w-48 h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="en">\uD83C\uDDEC\uD83C\uDDE7 English</SelectItem><SelectItem value="ar">\uD83C\uDDF8\uD83C\uDDE6 Arabic</SelectItem></SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Language shown to first-time visitors</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor={`${langFormId}-toggle`} className="text-xs font-semibold">Show Language Toggle</Label>
                <p className="text-xs text-muted-foreground">Display EN/AR switcher in navbar</p>
              </div>
              <Switch id={`${langFormId}-toggle`} checked={langForm.show_language_toggle} onCheckedChange={(val) => setLangForm(prev => ({ ...prev, show_language_toggle: val }))} disabled={langForm.language_mode !== "both"} />
            </div>
          </>)}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor={`${langFormId}-rtl`} className="text-xs font-semibold">RTL Layout</Label>
              <p className="text-xs text-muted-foreground">Right-to-left layout when Arabic is active</p>
            </div>
            <Switch id={`${langFormId}-rtl`} checked={langForm.rtl_enabled} onCheckedChange={(val) => setLangForm(prev => ({ ...prev, rtl_enabled: val }))} disabled={langForm.language_mode === "en_only"} />
          </div>
          <ArabicContentStatus />
          <Button size="sm" onClick={handleSaveLanguage} disabled={savingLang}><Save size={14} className="mr-1.5" />{savingLang ? "Saving..." : "Save Language Settings"}</Button>
        </CardContent></Card>
    </div>
  );
}
