import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Save, RefreshCw, Sun, Moon, Eye, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";

type ThemeData = {
  mode: "light" | "dark";
  lightPrimary: string; lightAccent: string; lightBackground: string;
  lightForeground: string; lightCard: string; lightBorder: string;
  lightMuted: string; lightMutedForeground: string; lightRing: string;
  darkPrimary: string; darkAccent: string; darkBackground: string;
  darkForeground: string; darkCard: string; darkBorder: string;
  darkMuted: string; darkMutedForeground: string; darkRing: string;
  radius: string;
};

const DEFAULTS: ThemeData = {
  mode: "light",
  lightPrimary: "204 92% 42%", lightAccent: "189 90% 38%",
  lightBackground: "220 30% 97%", lightForeground: "222 40% 10%",
  lightCard: "0 0% 100%", lightBorder: "220 18% 84%",
  lightMuted: "220 20% 91%", lightMutedForeground: "220 15% 42%", lightRing: "204 92% 45%",
  darkPrimary: "204 92% 62%", darkAccent: "189 95% 53%",
  darkBackground: "222 48% 6%", darkForeground: "210 30% 96%",
  darkCard: "222 40% 9%", darkBorder: "220 22% 18%",
  darkMuted: "222 32% 12%", darkMutedForeground: "215 18% 72%", darkRing: "204 92% 62%",
  radius: "0.9rem",
};

function hslToHex(hsl: string): string {
  try {
    const parts = hsl.trim().split(/\s+/);
    if (parts.length !== 3) return "#888888";
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  } catch { return "#888888"; }
}

function hexToHsl(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch { return "0 0% 50%"; }
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  const hex = hslToHex(value);
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded border border-border shrink-0" style={{ background: `hsl(${value})` }} />
      <Label className="w-36 text-xs shrink-0 text-muted-foreground">{label}</Label>
      <input
        type="color"
        value={hex}
        onChange={e => onChange(hexToHsl(e.target.value))}
        className="w-8 h-8 rounded cursor-pointer border border-border p-0.5 bg-transparent shrink-0"
        aria-label={label}
      />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-xs font-mono h-8 flex-1"
        placeholder="H S% L%"
      />
    </div>
  );
}

const LIGHT_FIELDS: [keyof ThemeData, string][] = [
  ["lightPrimary", "Primary"],
  ["lightAccent", "Accent"],
  ["lightBackground", "Background"],
  ["lightForeground", "Foreground"],
  ["lightCard", "Card"],
  ["lightBorder", "Border"],
  ["lightMuted", "Muted"],
  ["lightMutedForeground", "Muted Foreground"],
  ["lightRing", "Focus Ring"],
];

const DARK_FIELDS: [keyof ThemeData, string][] = [
  ["darkPrimary", "Primary"],
  ["darkAccent", "Accent"],
  ["darkBackground", "Background"],
  ["darkForeground", "Foreground"],
  ["darkCard", "Card"],
  ["darkBorder", "Border"],
  ["darkMuted", "Muted"],
  ["darkMutedForeground", "Muted Foreground"],
  ["darkRing", "Focus Ring"],
];

function PreviewPalette({ theme, mode }: { theme: ThemeData; mode: "light" | "dark" }) {
  const primary = mode === "light" ? theme.lightPrimary : theme.darkPrimary;
  const accent = mode === "light" ? theme.lightAccent : theme.darkAccent;
  const bg = mode === "light" ? theme.lightBackground : theme.darkBackground;
  const card = mode === "light" ? theme.lightCard : theme.darkCard;
  const fg = mode === "light" ? theme.lightForeground : theme.darkForeground;
  const muted = mode === "light" ? theme.lightMuted : theme.darkMuted;
  const border = mode === "light" ? theme.lightBorder : theme.darkBorder;

  return (
    <div
      className="rounded-xl p-4 space-y-3 border"
      style={{ background: `hsl(${bg})`, borderColor: `hsl(${border})` }}
    >
      <div style={{ color: `hsl(${fg})` }} className="text-sm font-semibold">
        {mode === "light" ? "☀️" : "🌙"} {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode Preview
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Primary", bg: primary, fg: "0 0% 100%" },
          { label: "Accent", bg: accent, fg: "0 0% 100%" },
          { label: "Muted", bg: muted, fg: fg },
        ].map(({ label, bg: btnBg, fg: btnFg }) => (
          <div
            key={label}
            className="px-3 py-1 rounded-md text-xs font-medium"
            style={{ background: `hsl(${btnBg})`, color: `hsl(${btnFg})`, borderRadius: theme.radius }}
          >
            {label}
          </div>
        ))}
      </div>
      <div
        className="rounded-lg p-3 border"
        style={{ background: `hsl(${card})`, borderColor: `hsl(${border})`, borderRadius: theme.radius }}
      >
        <div style={{ color: `hsl(${fg})` }} className="text-xs font-medium">Card Surface</div>
        <div style={{ color: `hsl(${fg})`, opacity: 0.6 }} className="text-xs mt-1">Body text & content area</div>
      </div>
    </div>
  );
}

export default function ThemeManager() {
  const { toast } = useToast();
  const { data: themeData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["themeSettings"],
    queryFn: async () => {
      const res = await api.themeSettings.get();
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
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

  const set = (key: keyof ThemeData, val: string | "light" | "dark") => {
    setTheme(t => ({ ...t, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.themeSettings.update({
        mode: theme.mode,
        light_primary: theme.lightPrimary,
        light_accent: theme.lightAccent,
        light_background: theme.lightBackground,
        light_foreground: theme.lightForeground,
        light_card: theme.lightCard,
        light_border: theme.lightBorder,
        light_muted: theme.lightMuted,
        light_muted_foreground: theme.lightMutedForeground,
        light_ring: theme.lightRing,
        dark_primary: theme.darkPrimary,
        dark_accent: theme.darkAccent,
        dark_background: theme.darkBackground,
        dark_foreground: theme.darkForeground,
        dark_card: theme.darkCard,
        dark_border: theme.darkBorder,
        dark_muted: theme.darkMuted,
        dark_muted_foreground: theme.darkMutedForeground,
        dark_ring: theme.darkRing,
        radius: theme.radius,
      });
      if (!res.success) throw new Error(res.message);
      toast({ title: "Theme saved", description: "Portfolio will reflect changes live." });
    } catch (err) {
      logError("Failed to save theme settings", err, "ThemeManager");
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTheme(DEFAULTS);
    toast({ title: "Reset to defaults", description: "Click Save to apply." });
  };

  const radiusNum = parseFloat(theme.radius) * 16;

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Theme Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Edit color tokens — changes apply to the live portfolio instantly.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw size={14} className="mr-1.5" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save size={14} className="mr-1.5" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sun size={15} /> Light Mode Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {LIGHT_FIELDS.map(([key, label]) => (
                <ColorField
                  key={key}
                  label={label}
                  value={theme[key] as string}
                  onChange={v => set(key, v)}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Moon size={15} /> Dark Mode Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {DARK_FIELDS.map(([key, label]) => (
                <ColorField
                  key={key}
                  label={label}
                  value={theme[key] as string}
                  onChange={v => set(key, v)}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Border Radius</CardTitle>
              <CardDescription className="text-xs">{theme.radius}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Slider
                value={[radiusNum]}
                min={0}
                max={24}
                step={1}
                onValueChange={([v]) => set("radius", `${(v / 16).toFixed(3)}rem`)}
              />
              <div className="flex gap-3">
                {[0, 4, 8, 12, 16, 20, 24].map(px => (
                  <div
                    key={px}
                    onClick={() => set("radius", `${(px / 16).toFixed(3)}rem`)}
                    onKeyDown={(e) => e.key === "Enter" && set("radius", `${(px / 16).toFixed(3)}rem`)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Border radius: ${px}px`}
                    className="w-8 h-8 bg-primary/20 border-2 border-primary/30 cursor-pointer hover:border-primary transition-colors"
                    style={{ borderRadius: `${px}px` }}
                    title={`${px}px`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye size={15} /> Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PreviewPalette theme={theme} mode="light" />
              <PreviewPalette theme={theme} mode="dark" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
