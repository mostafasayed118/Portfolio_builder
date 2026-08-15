import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@workspace/ui";
import { Save, RefreshCw, Sun, Moon, Eye } from "lucide-react";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";
import { Button, Card, CardContent, CardHeader, CardTitle, Slider } from "@workspace/ui";
import { AdminErrorState } from "@/components/AdminErrorState";
import { AdminLoadingState } from "@/components/AdminLoadingState";
import { ColorField } from "@/features/settings/components/ThemeColorFields";
import { PreviewPalette, type ThemePreviewData } from "@/features/settings/components/ThemePreview";
import { PresetPicker, findActivePreset, THEME_PRESETS, type ThemePreset } from "@/features/settings/components/ThemePresets";

type ThemeData = ThemePreviewData;

const DEFAULTS: ThemeData = {
  mode: "light",
  lightPrimary: "204 92% 42%", lightAccent: "189 90% 38%", lightBackground: "220 30% 97%",
  lightForeground: "222 40% 10%", lightCard: "0 0% 100%", lightBorder: "220 18% 84%",
  lightMuted: "220 20% 91%", lightMutedForeground: "220 15% 42%", lightRing: "204 92% 45%",
  darkPrimary: "204 92% 62%", darkAccent: "189 95% 53%", darkBackground: "222 48% 6%",
  darkForeground: "210 30% 96%", darkCard: "222 40% 9%", darkBorder: "220 22% 18%",
  darkMuted: "222 32% 12%", darkMutedForeground: "215 18% 72%", darkRing: "204 92% 62%",
  radius: "0.9rem",
};

const LIGHT_FIELDS: [keyof ThemeData, string][] = [
  ["lightPrimary", "Primary"], ["lightAccent", "Accent"], ["lightBackground", "Background"],
  ["lightForeground", "Foreground"], ["lightCard", "Card"], ["lightBorder", "Border"],
  ["lightMuted", "Muted"], ["lightMutedForeground", "Muted Foreground"], ["lightRing", "Focus Ring"],
];

const DARK_FIELDS: [keyof ThemeData, string][] = [
  ["darkPrimary", "Primary"], ["darkAccent", "Accent"], ["darkBackground", "Background"],
  ["darkForeground", "Foreground"], ["darkCard", "Card"], ["darkBorder", "Border"],
  ["darkMuted", "Muted"], ["darkMutedForeground", "Muted Foreground"], ["darkRing", "Focus Ring"],
];

export default function ThemeManager() {
  const { toast } = useToast();
  const { data: themeData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["themeSettings"],
    queryFn: async () => { const res = await api.themeSettings.get(); if (!res.success) throw new Error(res.message); return res.data; },
  });
  const [theme, setTheme] = useState<ThemeData>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (themeData) {
      setTheme({
        mode: themeData.mode ?? "light",
        lightPrimary: themeData.light_primary ?? DEFAULTS.lightPrimary,
        lightAccent: themeData.light_accent ?? DEFAULTS.lightAccent,
        lightBackground: themeData.light_background ?? DEFAULTS.lightBackground,
        lightForeground: themeData.light_foreground ?? DEFAULTS.lightForeground,
        lightCard: themeData.light_card ?? DEFAULTS.lightCard,
        lightBorder: themeData.light_border ?? DEFAULTS.lightBorder,
        lightMuted: themeData.light_muted ?? DEFAULTS.lightMuted,
        lightMutedForeground: themeData.light_muted_foreground ?? DEFAULTS.lightMutedForeground,
        lightRing: themeData.light_ring ?? DEFAULTS.lightRing,
        darkPrimary: themeData.dark_primary ?? DEFAULTS.darkPrimary,
        darkAccent: themeData.dark_accent ?? DEFAULTS.darkAccent,
        darkBackground: themeData.dark_background ?? DEFAULTS.darkBackground,
        darkForeground: themeData.dark_foreground ?? DEFAULTS.darkForeground,
        darkCard: themeData.dark_card ?? DEFAULTS.darkCard,
        darkBorder: themeData.dark_border ?? DEFAULTS.darkBorder,
        darkMuted: themeData.dark_muted ?? DEFAULTS.darkMuted,
        darkMutedForeground: themeData.dark_muted_foreground ?? DEFAULTS.darkMutedForeground,
        darkRing: themeData.dark_ring ?? DEFAULTS.darkRing,
        radius: themeData.radius ?? DEFAULTS.radius,
      });
    }
  }, [themeData]);

  const set = (key: keyof ThemeData, val: string) => setTheme(t => ({ ...t, [key]: val }));

  const activePreset = findActivePreset(theme);

  /** Pre-fill the form with a template's palette; the current mode is kept. */
  const applyPreset = (preset: ThemePreset) => {
    setTheme(t => ({ ...preset.theme, mode: t.mode }));
    toast({ title: `${preset.name} applied`, description: "Fine-tune any color below, then click Save Changes." });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.themeSettings.update({
        mode: theme.mode, light_primary: theme.lightPrimary, light_accent: theme.lightAccent,
        light_background: theme.lightBackground, light_foreground: theme.lightForeground,
        light_card: theme.lightCard, light_border: theme.lightBorder, light_muted: theme.lightMuted,
        light_muted_foreground: theme.lightMutedForeground, light_ring: theme.lightRing,
        dark_primary: theme.darkPrimary, dark_accent: theme.darkAccent, dark_background: theme.darkBackground,
        dark_foreground: theme.darkForeground, dark_card: theme.darkCard, dark_border: theme.darkBorder,
        dark_muted: theme.darkMuted, dark_muted_foreground: theme.darkMutedForeground, dark_ring: theme.darkRing,
        radius: theme.radius,
      });
      if (!res.success) throw new Error(res.message);
      toast({ title: "Theme saved", description: "Portfolio will reflect changes live." });
    } catch (err) {
      logError("Failed to save theme settings", err, "ThemeManager");
      toast({ title: "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const radiusNum = parseFloat(theme.radius) * 16;

  if (isLoading) return <AdminLoadingState />;
  if (isError) return <AdminErrorState title="Failed to load data" message={error?.message} onRetry={() => refetch()} />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Theme Manager</h1><p className="text-sm text-muted-foreground mt-0.5">Start from a template or edit color tokens — changes apply to the live portfolio instantly.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setTheme(t => ({ ...THEME_PRESETS[0].theme, mode: t.mode })); toast({ title: "Reset to Modern Indigo", description: "Click Save to apply." }); }} className="min-h-[44px]"><RefreshCw size={14} className="mr-1.5" /> Reset</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="min-h-[44px]"><Save size={14} className="mr-1.5" />{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Templates</CardTitle>
          <p className="text-xs text-muted-foreground">
            Pick a modern template to pre-fill the palette, then fine-tune any color below.
            Currently using <span className="font-medium text-foreground">{activePreset ? activePreset.name : "custom colors"}</span>.
          </p>
        </CardHeader>
        <CardContent>
          <PresetPicker activePresetId={activePreset?.id ?? null} onApply={applyPreset} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Sun size={15} /> Light Mode Colors</CardTitle></CardHeader>
            <CardContent className="space-y-3">{LIGHT_FIELDS.map(([key, label]) => <ColorField key={key} label={label} value={theme[key] as string} onChange={v => set(key, v)} />)}</CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Moon size={15} /> Dark Mode Colors</CardTitle></CardHeader>
            <CardContent className="space-y-3">{DARK_FIELDS.map(([key, label]) => <ColorField key={key} label={label} value={theme[key] as string} onChange={v => set(key, v)} />)}</CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Border Radius</CardTitle><p className="text-xs text-muted-foreground">{theme.radius}</p></CardHeader>
            <CardContent className="space-y-4">
              <Slider value={[radiusNum]} min={0} max={24} step={1} onValueChange={([v]) => set("radius", `${(v / 16).toFixed(3)}rem`)} />
              <div className="flex gap-3">{[0, 4, 8, 12, 16, 20, 24].map(px => (
                <div key={px} onClick={() => set("radius", `${(px / 16).toFixed(3)}rem`)} role="button" tabIndex={0} aria-label={`Border radius: ${px}px`} className="w-8 h-8 bg-primary/20 border-2 border-primary/30 cursor-pointer hover:border-primary transition-colors" style={{ borderRadius: `${px}px` }} title={`${px}px`} />
              ))}</div>
            </CardContent></Card>
        </div>
        <div className="space-y-4"><Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye size={15} /> Live Preview</CardTitle></CardHeader>
          <CardContent className="space-y-4"><PreviewPalette theme={theme} mode="light" /><PreviewPalette theme={theme} mode="dark" /></CardContent></Card></div>
      </div>
    </div>
  );
}
