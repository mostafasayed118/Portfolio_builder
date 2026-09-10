import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@workspace/ui";
import { Save, RefreshCw, Sun, Moon, Eye, Dices, BookmarkPlus, Download, Upload, Palette, Wand2, Copy } from "lucide-react";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";
import { Button, Card, CardContent, CardHeader, CardTitle, Slider, Input } from "@workspace/ui";
import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";
import { AdminErrorState } from "@/components/AdminErrorState";
import { AdminLoadingState } from "@/components/AdminLoadingState";
import { ColorField } from "@/features/settings/components/ThemeColorFields";
import { PreviewPalette, type ThemePreviewData } from "@/features/settings/components/ThemePreview";
import {
  PresetPicker,
  findActivePreset,
  THEME_PRESETS,
  loadCustomPresets,
  MAX_CUSTOM_TEMPLATES,
  parseImportedPresets,
  planImport,
  exportPresetsToFile,
  type ThemePreset,
  type ImportPlan,
} from "@/features/settings/components/ThemePresets";
import {
  randomizeTheme,
  nextHarmonyType,
  HARMONY_LABELS,
  generateSeed,
  type HarmonyType,
} from "@/features/settings/lib/randomize-theme";

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
  const { data: customPresets = [], refetch: refetchPresets } = useQuery({
    queryKey: ["themePresets"],
    queryFn: loadCustomPresets,
  });
  const [theme, setTheme] = useState<ThemeData>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  /** Color-harmony family the Randomize button currently produces. */
  const [harmonyType, setHarmonyType] = useState<HarmonyType>("analogous");
  /** Seed of the current palette — empty when generated unseeded. */
  const [paletteSeed, setPaletteSeed] = useState("");
  /** A template with the same name already exists; pending user overwrite choice. */
  const [overwriteTarget, setOverwriteTarget] = useState<ThemePreset | null>(null);
  /** Import plan awaiting confirmation (overwrites existing templates). */
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const allPresets = [...customPresets, ...THEME_PRESETS];
  const activePreset = findActivePreset(theme, allPresets);

  /** Pre-fill the form with a template's palette; the current mode is kept. */
  const applyPreset = (preset: ThemePreset) => {
    setTheme(t => ({ ...preset.theme, mode: t.mode }));
    toast({ title: `${preset.name} applied`, description: "Fine-tune any color below, then click Save Changes." });
  };

  /** Replace the palette with a freshly generated scheme; cycles harmony on each click. */
  const applyRandomPalette = () => {
    const harmony = harmonyType;
    const next = nextHarmonyType(harmony);
    const seed = generateSeed();
    setPaletteSeed(seed);
    setTheme(t => randomizeTheme(t, harmony, seed));
    setHarmonyType(next);
    toast({
      title: `Random ${HARMONY_LABELS[harmony]} palette generated`,
      description: `${HARMONY_LABELS[harmony]} harmony — seed ${seed}. Next click: ${HARMONY_LABELS[next]}.`,
    });
  };

  /** Regenerate the exact same palette from a shared seed string. */
  const applySeedPalette = () => {
    const seed = paletteSeed.trim();
    if (!seed) return;
    setTheme(t => randomizeTheme(t, harmonyType, seed));
    toast({ title: "Palette applied from seed", description: `Seed "${seed}" regenerated identically.` });
  };

  /** Copy the current seed to the clipboard for sharing/bookmarking. */
  const copySeed = async () => {
    const seed = paletteSeed.trim();
    if (!seed) return;
    try {
      await navigator.clipboard.writeText(seed);
      toast({ title: "Seed copied", description: "Share it to regenerate this palette anywhere." });
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "destructive" });
    }
  };

  /**
   * Persist the current palette as a custom template under `name` (server-side,
   * capped). Shared by the named "Save as template" flow and the one-click
   * auto-named "Save as preset" flow.
   */
  const saveNamedTemplate = async (name: string, opts: { clearInput: boolean; toastTitle: string }) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const nameExists = customPresets.some((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase());
    // Overwriting an existing template doesn't add a row, so it's allowed
    // even when the 10-template cap is already reached.
    if (customPresets.length >= MAX_CUSTOM_TEMPLATES && !nameExists) {
      toast({ title: "Template limit reached", description: `You can save up to ${MAX_CUSTOM_TEMPLATES} custom templates. Delete one to save another.`, variant: "destructive" });
      return;
    }
    try {
      const res = await api.themePresets.create({
        name: trimmed,
        description: `Custom palette saved on ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`,
        palette: { ...theme },
      });
      if (!res.success) {
        if (res.code === "DUPLICATE_NAME") {
          const existing = customPresets.find((p) => p.id === res.existingId)
            ?? customPresets.find((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase());
          setOverwriteTarget(existing ?? { id: res.existingId ?? "", name: trimmed, description: "", theme: { ...theme } });
          return;
        }
        throw new Error(res.message);
      }
      await refetchPresets();
      if (opts.clearInput) setNewTemplateName("");
      toast({ title: opts.toastTitle, description: `"${trimmed}" is now available in the template grid.` });
    } catch (err) {
      logError("Failed to save template", err, "ThemeManager");
      toast({ title: "Save failed", description: "The template was not saved. Please try again.", variant: "destructive" });
    }
  };

  /** Save the current palette under the name typed into the field. */
  const saveCurrentAsTemplate = () => {
    void saveNamedTemplate(newTemplateName, { clearInput: true, toastTitle: "Template saved" });
  };

  /**
   * One-click save: auto-name the current palette (Preset 1, Preset 2, …) so a
   * freshly generated scheme is immediately reusable from the template grid.
   */
  const saveCurrentAsPreset = () => {
    let n = customPresets.length + 1;
    while (customPresets.some((p) => p.name.trim().toLowerCase() === `preset ${n}`)) n += 1;
    void saveNamedTemplate(`Preset ${n}`, { clearInput: false, toastTitle: "Preset saved" });
  };

  /** Download the current custom templates as a JSON file. */
  const handleExport = () => {
    if (customPresets.length === 0) return;
    exportPresetsToFile(customPresets);
    toast({
      title: "Templates exported",
      description: `${customPresets.length} template${customPresets.length === 1 ? "" : "s"} saved to a JSON file.`,
    });
  };

  /** Read an imported file, validate it, and run (or confirm) the import. */
  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    const raw = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"));
      reader.readAsText(file);
    });
    const presets = parseImportedPresets(raw);
    if (presets.length === 0) {
      toast({ title: "Import failed", description: "The file doesn't contain any valid templates.", variant: "destructive" });
      return;
    }
    const plan = planImport(presets, customPresets);
    if (plan.toOverwrite.length > 0) {
      setImportPlan(plan);
      return;
    }
    await runImport(plan);
  };

  /** Execute an import plan: create new templates, overwrite name collisions. */
  const runImport = async (plan: ImportPlan) => {
    setImporting(true);
    let created = 0;
    let overwritten = 0;
    let failed = 0;
    try {
      const write = (id: string | undefined, preset: ThemePreset, isNew: boolean) => {
        const payload = {
          description: preset.description,
          palette: preset.theme as Record<string, string>,
        };
        return isNew
          ? api.themePresets.create({ name: preset.name, ...payload })
          : api.themePresets.update(id as string, payload);
      };
      for (const preset of plan.toCreate) {
        const res = await write(undefined, preset, true);
        if (res.success) created += 1;
        else if (res.code === "DUPLICATE_NAME" && res.existingId) {
          // Race: another device created the same name between plan and write.
          const retry = await write(res.existingId, preset, false);
          if (retry.success) overwritten += 1; else failed += 1;
        } else failed += 1;
      }
      for (const { preset, existing } of plan.toOverwrite) {
        const res = await write(existing.id, preset, false);
        if (res.success) overwritten += 1; else failed += 1;
      }
      await refetchPresets();
    } finally {
      setImporting(false);
      setImportPlan(null);
    }
    const parts: string[] = [];
    if (created) parts.push(`${created} imported`);
    if (overwritten) parts.push(`${overwritten} overwritten`);
    if (failed) parts.push(`${failed} failed`);
    if (plan.skipped) parts.push(`${plan.skipped} skipped (10-template limit)`);
    toast({
      title: "Import complete",
      description: parts.length ? parts.join(" · ") : "Nothing changed.",
      variant: failed > 0 ? "destructive" : undefined,
    });
  };

  /** Replace an existing template's palette (name stays the same). */
  const overwritePreset = async () => {
    if (!overwriteTarget) return;
    try {
      const res = await api.themePresets.update(overwriteTarget.id, {
        description: `Custom palette saved on ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`,
        palette: { ...theme },
      });
      if (!res.success) throw new Error(res.message);
      await refetchPresets();
      const name = overwriteTarget.name;
      setOverwriteTarget(null);
      setNewTemplateName("");
      toast({ title: "Template overwritten", description: `"${name}" now uses the current palette.` });
    } catch (err) {
      // Rethrow so the confirm dialog surfaces the failure next to its buttons.
      throw err instanceof Error ? err : new Error(String(err));
    }
  };

  /** Remove a saved custom template (server-side soft delete). */
  const deleteCustomPreset = async (id: string) => {
    const target = customPresets.find((p) => p.id === id);
    try {
      const res = await api.themePresets.delete(id);
      if (!res.success) throw new Error(res.message);
      await refetchPresets();
      toast({ title: "Template deleted", description: target ? `"${target.name}" was removed.` : undefined });
    } catch (err) {
      logError("Failed to delete template", err, "ThemeManager");
      toast({ title: "Delete failed", description: "The template was not removed. Please try again.", variant: "destructive" });
    }
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
        <div><h1 className="text-2xl font-bold">Theme Manager</h1><p className="text-sm text-muted-foreground mt-0.5">Start from a template or edit color tokens — changes apply to the live portfolio instantly.</p></div>        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={applyRandomPalette} className="min-h-[44px]" title={`Generates a ${HARMONY_LABELS[harmonyType]} scheme — click again for ${HARMONY_LABELS[nextHarmonyType(harmonyType)]}`}>
            <Dices size={14} className="mr-1.5" /> Randomize
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setTheme(t => ({ ...THEME_PRESETS[0].theme, mode: t.mode })); toast({ title: "Reset to Modern Indigo", description: "Click Save to apply." }); }} className="min-h-[44px]"><RefreshCw size={14} className="mr-1.5" /> Reset</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="min-h-[44px]"><Save size={14} className="mr-1.5" />{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="palette-seed" className="text-xs text-muted-foreground whitespace-nowrap">Seed</label>
        <Input
          id="palette-seed"
          aria-label="Palette seed"
          value={paletteSeed}
          onChange={(e) => setPaletteSeed(e.target.value)}
          placeholder="palette-seed-abc123"
          className="h-9 flex-1 font-mono text-xs"
        />
        <Button variant="outline" size="sm" onClick={applySeedPalette} disabled={!paletteSeed.trim()} className="min-h-[44px]" title="Regenerate this exact palette from the seed">
          <Wand2 size={14} className="mr-1.5" /> Apply seed
        </Button>
        <Button variant="outline" size="sm" onClick={copySeed} disabled={!paletteSeed.trim()} className="min-h-[44px]" title="Copy the seed to share or bookmark it">
          <Copy size={14} className="mr-1.5" /> Copy
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Templates</CardTitle>
          <p className="text-xs text-muted-foreground">
            Pick a modern template to pre-fill the palette, then fine-tune any color below.
            Currently using <span className="font-medium text-foreground">{activePreset ? activePreset.name : "custom colors"}</span>.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} disabled={customPresets.length === 0 || importing} className="min-h-[44px]">
                <Download size={14} className="mr-1.5" /> Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing} className="min-h-[44px]">
                <Upload size={14} className="mr-1.5" /> Import
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                aria-label="Import templates from a JSON file"
                data-testid="import-templates-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  void handleImportFile(file);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {customPresets.length}/{MAX_CUSTOM_TEMPLATES} saved
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={saveCurrentAsPreset} className="min-h-[44px]" title="Save the current palette as Preset N — no naming needed">
              <Palette size={14} className="mr-1.5" /> Save as preset
            </Button>
            <Input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveCurrentAsTemplate()}
              placeholder="Name this palette…"
              aria-label="Name for the new template"
              className="h-9 flex-1"
            />
            <Button size="sm" onClick={saveCurrentAsTemplate} disabled={!newTemplateName.trim()} className="min-h-[44px]">
              <BookmarkPlus size={14} className="mr-1.5" /> Save as template
            </Button>
          </div>
          <PresetPicker
            activePresetId={activePreset?.id ?? null}
            onApply={applyPreset}
            customPresets={customPresets}
            onDeleteCustom={deleteCustomPreset}
          />
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
      <SmartConfirmDialog
        state={{
          isOpen: overwriteTarget !== null,
          title: `Overwrite "${overwriteTarget?.name ?? ""}"?`,
          message: `A template named "${overwriteTarget?.name ?? ""}" already exists. Overwriting replaces its saved palette with the current colors — this cannot be undone.`,
          confirmLabel: "Overwrite",
          cancelLabel: "Don't overwrite",
          variant: "warning",
          onConfirm: overwritePreset,
        }}
        onCancel={() => setOverwriteTarget(null)}
      />
      <SmartConfirmDialog
        state={{
          isOpen: importPlan !== null,
          title: `Import ${importPlan ? importPlan.toCreate.length + importPlan.toOverwrite.length : 0} template${importPlan && importPlan.toCreate.length + importPlan.toOverwrite.length === 1 ? "" : "s"}?`,
          message: importPlan
            ? `This will add ${importPlan.toCreate.length} new template${importPlan.toCreate.length === 1 ? "" : "s"} and overwrite ${importPlan.toOverwrite.length} existing template${importPlan.toOverwrite.length === 1 ? "" : "s"} with the same name.`
            : "",
          confirmLabel: "Import",
          cancelLabel: "Cancel",
          variant: "warning",
          onConfirm: async () => {
            if (importPlan) await runImport(importPlan);
          },
        }}
        onCancel={() => setImportPlan(null)}
      />
    </div>
  );
}
