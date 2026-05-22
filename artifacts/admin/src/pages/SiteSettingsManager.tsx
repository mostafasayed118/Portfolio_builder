import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@workspace/ui";
import { Save, AlertCircle, RefreshCw, Globe, Check, X, AlertTriangle } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, RadioGroup, RadioGroupItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Switch } from "@workspace/ui";

type LanguageMode = "en_only" | "ar_only" | "both";

type SiteData = { site_name: string; site_tagline: string; footer_text: string; copyright_text: string; logo_text: string; default_theme: "light" | "dark" };
const DEFAULTS: SiteData = { site_name: "Mustafa Sayed", site_tagline: "Data Engineer", footer_text: "", copyright_text: "", logo_text: "MS", default_theme: "dark" };

type LanguageForm = {
  language_mode: LanguageMode;
  default_language: "en" | "ar";
  show_language_toggle: boolean;
  rtl_enabled: boolean;
};

const LANG_DEFAULTS: LanguageForm = {
  language_mode: "en_only",
  default_language: "en",
  show_language_toggle: false,
  rtl_enabled: false,
};

function StatusRow({ label, status }: { label: string; status: "complete" | "partial" | "missing" }) {
  const icon = status === "complete" ? <Check className="h-4 w-4 text-green-500" />
    : status === "partial" ? <AlertTriangle className="h-4 w-4 text-yellow-500" />
    : <X className="h-4 w-4 text-red-500" />;
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      {icon}
    </div>
  );
}

function ArabicContentStatus() {
  const { data: stats } = useQuery({
    queryKey: ["arabic-content-status"],
    queryFn: async () => {
      const supabase = getSupabase();
      const [heroRes, aboutRes, projectsRes, experienceRes, certsRes] = await Promise.all([
        supabase.from("hero_content").select("name_ar").not("name_ar", "is", null).maybeSingle(),
        supabase.from("about_content").select("bio_ar").not("bio_ar", "is", null).maybeSingle(),
        supabase.from("projects").select("id, title_ar").not("title_ar", "is", null),
        supabase.from("experience").select("id, title_ar").not("title_ar", "is", null),
        supabase.from("certifications").select("id, title_ar").not("title_ar", "is", null),
      ]);
      return {
        hero: !!heroRes.data,
        about: !!aboutRes.data,
        projects: { filled: projectsRes.data?.length ?? 0 },
        experience: { filled: experienceRes.data?.length ?? 0 },
        certifications: { filled: certsRes.data?.length ?? 0 },
      };
    },
    enabled: isSupabaseConfigured,
    staleTime: 1000 * 60,
  });

  return (
    <div className="rounded-lg border p-4 space-y-1.5">
      <p className="text-sm font-medium mb-2">Arabic Content Status</p>
      <StatusRow label="Hero" status={stats?.hero ? "complete" : "missing"} />
      <StatusRow label="About" status={stats?.about ? "complete" : "missing"} />
      <StatusRow label={`Projects (${stats?.projects.filled ?? "?"})`} status={stats?.projects && stats.projects.filled > 0 ? "complete" : "missing"} />
      <StatusRow label={`Experience (${stats?.experience.filled ?? "?"})`} status={stats?.experience && stats.experience.filled > 0 ? "complete" : "missing"} />
      <StatusRow label={`Certifications (${stats?.certifications.filled ?? "?"})`} status={stats?.certifications && stats.certifications.filled > 0 ? "complete" : "missing"} />
    </div>
  );
}

export default function SiteSettingsManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: async () => {
      const res = await api.siteSettings.get();
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
    enabled: isSupabaseConfigured,
  });
  const [form, setForm] = useState<SiteData>(DEFAULTS);
  const [langForm, setLangForm] = useState<LanguageForm>(LANG_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [savingLang, setSavingLang] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        site_name: data.site_name ?? "",
        site_tagline: data.site_tagline ?? "",
        footer_text: data.footer_text ?? "",
        copyright_text: data.copyright_text ?? "",
        logo_text: data.logo_text ?? "",
        default_theme: data.default_theme ?? "dark",
      });
      setLangForm({
        language_mode: (data.language_mode as LanguageMode) ?? "en_only",
        default_language: (data.default_language as "en" | "ar") ?? "en",
        show_language_toggle: data.show_language_toggle ?? false,
        rtl_enabled: data.rtl_enabled ?? false,
      });
    }
  }, [data]);

  const set = (k: keyof SiteData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.siteSettings.update(form);
      if (!res.success) throw new Error(res.message);
      toast({ title: "Site settings saved" });
    } catch (err) {
      logError("Failed to save site settings", err, "SiteSettingsManager");
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLanguage = async () => {
    setSavingLang(true);
    try {
      const result = await api.siteSettings.updateLanguage(langForm);
      if (result.success) {
        toast({ title: "Language settings saved" });
        queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
      } else {
        toast({ title: result.message ?? "Save failed", variant: "destructive" });
      }
    } catch (err) {
      logError("Failed to save language settings", err, "SiteSettingsManager");
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSavingLang(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
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
          <RefreshCw className="h-4 w-4 mr-2" />Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Site Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Name, tagline, footer, and localization.</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save size={14} className="mr-1.5" />{saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Identity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {([["site_name", "Site Name"], ["site_tagline", "Tagline"], ["logo_text", "Logo Text (2 letters)"]] as [keyof SiteData, string][]).map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <Label className="text-xs">{label}</Label>
              <Input value={form[k]} onChange={e => set(k, e.target.value)} className="h-9" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Footer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {([["footer_text", "Footer Text"], ["copyright_text", "Copyright Text"]] as [keyof SiteData, string][]).map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <Label className="text-xs">{label}</Label>
              <Input value={form[k]} onChange={e => set(k, e.target.value)} className="h-9" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Defaults</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label className="text-xs">Default Theme Mode</Label>
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

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Language & Localization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Language Mode</Label>
            <RadioGroup
              value={langForm.language_mode}
              onValueChange={(val) => setLangForm(prev => ({ ...prev, language_mode: val as LanguageMode }))}
              className="space-y-2"
            >
              {[
                { value: "en_only" as const, label: "English Only", desc: "Show portfolio in English only. Language toggle hidden.", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
                { value: "ar_only" as const, label: "Arabic Only", desc: "Show portfolio in Arabic only. RTL layout applied.", flag: "\uD83C\uDDF8\uD83C\uDDE6" },
                { value: "both" as const, label: "Both Languages", desc: "Visitors can switch between English and Arabic.", flag: "\uD83C\uDF10" },
              ].map(opt => (
                <div key={opt.value} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <Label htmlFor={opt.value} className="cursor-pointer">
                    <span className="font-medium">{opt.flag} {opt.label}</span>
                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {langForm.language_mode === "both" && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Default Language</Label>
                <Select
                  value={langForm.default_language}
                  onValueChange={(val) => setLangForm(prev => ({ ...prev, default_language: val as "en" | "ar" }))}
                >
                  <SelectTrigger className="w-48 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">\uD83C\uDDEC\uD83C\uDDE7 English</SelectItem>
                    <SelectItem value="ar">\uD83C\uDDF8\uD83C\uDDE6 Arabic</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Language shown to first-time visitors</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">Show Language Toggle</Label>
                  <p className="text-xs text-muted-foreground">Display EN/AR switcher in navbar</p>
                </div>
                <Switch
                  checked={langForm.show_language_toggle}
                  onCheckedChange={(val) => setLangForm(prev => ({ ...prev, show_language_toggle: val }))}
                  disabled={langForm.language_mode !== "both"}
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold">RTL Layout</Label>
              <p className="text-xs text-muted-foreground">Right-to-left layout when Arabic is active</p>
            </div>
            <Switch
              checked={langForm.rtl_enabled}
              onCheckedChange={(val) => setLangForm(prev => ({ ...prev, rtl_enabled: val }))}
              disabled={langForm.language_mode === "en_only"}
            />
          </div>

          <ArabicContentStatus />

          <Button size="sm" onClick={handleSaveLanguage} disabled={savingLang}>
            <Save size={14} className="mr-1.5" />{savingLang ? "Saving..." : "Save Language Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
