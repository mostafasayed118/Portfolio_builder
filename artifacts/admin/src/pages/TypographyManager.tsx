import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Save, RefreshCw, Eye } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/convex";
import { getTypographySettings, upsertTypographySettings } from "@workspace/db/typography-settings";

type TypoData = {
  body_font: string;
  display_font: string;
  body_font_url: string;
  display_font_url: string;
  base_font_size: string;
  line_height: string;
  letter_spacing: string;
  heading_scale: string;
  font_weight_body: string;
  font_weight_heading: string;
};

const DEFAULTS: TypoData = {
  body_font: "Spline Sans",
  display_font: "Unbounded",
  body_font_url: "https://fonts.googleapis.com/css2?family=Spline+Sans:wght@300;400;500;600;700&display=swap",
  display_font_url: "https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&display=swap",
  base_font_size: "16px",
  line_height: "1.6",
  letter_spacing: "0em",
  heading_scale: "1.25",
  font_weight_body: "400",
  font_weight_heading: "700",
};

const PRESET_PAIRS = [
  { display: "Unbounded", body: "Spline Sans", displayUrl: "https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&display=swap", bodyUrl: "https://fonts.googleapis.com/css2?family=Spline+Sans:wght@300;400;500;600;700&display=swap" },
  { display: "Playfair Display", body: "Lato", displayUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap", bodyUrl: "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap" },
  { display: "Space Grotesk", body: "Inter", displayUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap", bodyUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" },
  { display: "Syne", body: "DM Sans", displayUrl: "https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&display=swap", bodyUrl: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap" },
  { display: "Bebas Neue", body: "Roboto", displayUrl: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap", bodyUrl: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" },
  { display: "Plus Jakarta Sans", body: "Plus Jakarta Sans", displayUrl: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap", bodyUrl: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" },
];

export default function TypographyManager() {
  const { toast } = useToast();
  const { data: typoData } = useQuery({
    queryKey: ["typographySettings"],
    queryFn: () => getTypographySettings(getSupabase()),
    enabled: isSupabaseConfigured,
  });
  const [typo, setTypo] = useState<TypoData>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typoData) {
      setTypo({
        body_font: typoData.body_font ?? DEFAULTS.body_font,
        display_font: typoData.display_font ?? DEFAULTS.display_font,
        body_font_url: typoData.body_font_url ?? DEFAULTS.body_font_url,
        display_font_url: typoData.display_font_url ?? DEFAULTS.display_font_url,
        base_font_size: typoData.base_font_size ?? DEFAULTS.base_font_size,
        line_height: typoData.line_height ?? DEFAULTS.line_height,
        letter_spacing: typoData.letter_spacing ?? DEFAULTS.letter_spacing,
        heading_scale: typoData.heading_scale ?? DEFAULTS.heading_scale,
        font_weight_body: typoData.font_weight_body ?? DEFAULTS.font_weight_body,
        font_weight_heading: typoData.font_weight_heading ?? DEFAULTS.font_weight_heading,
      });
    }
  }, [typoData]);

  const set = (key: keyof TypoData, val: string) => setTypo(t => ({ ...t, [key]: val }));

  const applyPreset = (preset: typeof PRESET_PAIRS[0]) => {
    setTypo(t => ({
      ...t,
      display_font: preset.display,
      body_font: preset.body,
      display_font_url: preset.displayUrl,
      body_font_url: preset.bodyUrl,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertTypographySettings(getSupabase(), {
        body_font: typo.body_font,
        display_font: typo.display_font,
        body_font_url: typo.body_font_url || undefined,
        display_font_url: typo.display_font_url || undefined,
        base_font_size: typo.base_font_size,
        line_height: typo.line_height,
        letter_spacing: typo.letter_spacing,
        heading_scale: typo.heading_scale,
        font_weight_body: typo.font_weight_body,
        font_weight_heading: typo.font_weight_heading,
      });
      toast({ title: "Typography saved", description: "Changes live on the portfolio." });
    } catch (err) {
      console.error(err);
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const baseSize = parseFloat(typo.base_font_size);
  const scale = parseFloat(typo.heading_scale);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Typography Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Control fonts, sizes, and text rhythm across the portfolio.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setTypo(DEFAULTS); toast({ title: "Reset to defaults" }); }}>
            <RefreshCw size={14} className="mr-1.5" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save size={14} className="mr-1.5" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Font Pairs</CardTitle>
              <CardDescription className="text-xs">Click a preset to apply it instantly</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {PRESET_PAIRS.map((p) => (
                <button
                  key={p.display}
                  onClick={() => applyPreset(p)}
                  className={`text-left p-3 rounded-lg border transition-all hover:border-primary/50 hover:bg-accent/50 ${
                    typo.display_font === p.display ? "border-primary bg-accent" : "border-border"
                  }`}
                >
                  <div className="font-semibold text-sm text-foreground">{p.display}</div>
                  <div className="text-xs text-muted-foreground">+ {p.body}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Custom Fonts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "display_font" as const, urlKey: "display_font_url" as const, label: "Display / Heading Font" },
                { key: "body_font" as const, urlKey: "body_font_url" as const, label: "Body Font" },
              ].map(({ key, urlKey, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Input value={typo[key]} onChange={e => set(key, e.target.value)} placeholder="Font name" className="h-8 text-sm" />
                  <Input value={typo[urlKey]} onChange={e => set(urlKey, e.target.value)} placeholder="Google Fonts URL (optional)" className="h-8 text-xs font-mono text-muted-foreground" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Scale & Rhythm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-xs">Base Font Size</Label>
                  <span className="text-xs text-muted-foreground font-mono">{typo.base_font_size}</span>
                </div>
                <Slider
                  value={[baseSize]}
                  min={12}
                  max={22}
                  step={0.5}
                  onValueChange={([v]) => set("base_font_size", `${v}px`)}
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-xs">Line Height</Label>
                  <span className="text-xs text-muted-foreground font-mono">{typo.line_height}</span>
                </div>
                <Slider
                  value={[parseFloat(typo.line_height) * 10]}
                  min={12}
                  max={22}
                  step={1}
                  onValueChange={([v]) => set("line_height", (v / 10).toFixed(1))}
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-xs">Heading Scale</Label>
                  <span className="text-xs text-muted-foreground font-mono">{typo.heading_scale}</span>
                </div>
                <Slider
                  value={[parseFloat(typo.heading_scale) * 100]}
                  min={110}
                  max={160}
                  step={5}
                  onValueChange={([v]) => set("heading_scale", (v / 100).toFixed(2))}
                />
              </div>
              <div>
                <Label className="text-xs">Letter Spacing</Label>
                <Input value={typo.letter_spacing} onChange={e => set("letter_spacing", e.target.value)} className="h-8 mt-1.5 text-sm font-mono" placeholder="0em" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Body Weight</Label>
                  <Input value={typo.font_weight_body} onChange={e => set("font_weight_body", e.target.value)} className="h-8 mt-1.5 text-sm font-mono" placeholder="400" />
                </div>
                <div>
                  <Label className="text-xs">Heading Weight</Label>
                  <Input value={typo.font_weight_heading} onChange={e => set("font_weight_heading", e.target.value)} className="h-8 mt-1.5 text-sm font-mono" placeholder="700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye size={15} /> Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-background p-5 space-y-4">
                <div>
                  <div
                    className="text-muted-foreground text-xs mb-1 uppercase tracking-widest"
                    style={{ fontFamily: typo.body_font, letterSpacing: "0.1em" }}
                  >
                    Data Engineer
                  </div>
                  <div
                    style={{
                      fontFamily: typo.display_font,
                      fontSize: `${baseSize * scale * scale * scale}px`,
                      fontWeight: typo.font_weight_heading,
                      lineHeight: 1.1,
                    }}
                    className="text-foreground"
                  >
                    Mustafa Sayed
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: typo.body_font,
                    fontSize: `${baseSize}px`,
                    lineHeight: typo.line_height,
                    letterSpacing: typo.letter_spacing,
                    fontWeight: typo.font_weight_body,
                  }}
                  className="text-muted-foreground"
                >
                  Building scalable data pipelines and transforming raw data into actionable insights. Passionate about ETL architecture and data warehouse design.
                </div>
                <div className="space-y-2">
                  {["h1", "h2", "h3", "h4"].map((tag, i) => {
                    const fSize = baseSize * Math.pow(scale, 4 - i);
                    return (
                      <div key={tag} style={{ fontFamily: typo.display_font, fontSize: `${fSize}px`, fontWeight: typo.font_weight_heading, lineHeight: 1.2 }} className="text-foreground">
                        {tag.toUpperCase()} — {fSize.toFixed(1)}px
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
