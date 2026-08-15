import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import type { ThemePreviewData } from "@/features/settings/components/ThemePreview";

/**
 * Preset theme templates for the admin Theme Manager.
 *
 * Each preset is a full light+dark palette (HSL triplets) plus a corner
 * radius. Applying a preset only pre-fills the form — every individual color
 * remains editable afterwards, so users keep full manual control. Presets are
 * purely client-side: nothing is persisted until "Save Changes" is clicked,
 * and no schema change is required.
 *
 * The first preset ("Modern Indigo") mirrors the original DEFAULTS so the
 * Reset button and fresh-load behavior stay byte-for-byte identical.
 */
export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme: ThemePreviewData;
}

/**
 * Custom templates are stored server-side (theme_presets table via the admin
 * API) so a palette saved on one device shows up on every other device the
 * admin signs in from. The legacy localStorage key (v1) survives as a one-time
 * migration source: on first load with an empty server list, saved palettes
 * are uploaded and the key is cleared.
 */
const CUSTOM_PRESETS_KEY = "pf-theme-custom-presets-v1";
const MAX_CUSTOM_PRESETS = 10;

const REQUIRED_THEME_KEYS: (keyof ThemePreviewData)[] = [
  "mode", "lightPrimary", "lightAccent", "lightBackground", "lightForeground", "lightCard",
  "lightBorder", "lightMuted", "lightMutedForeground", "lightRing",
  "darkPrimary", "darkAccent", "darkBackground", "darkForeground", "darkCard",
  "darkBorder", "darkMuted", "darkMutedForeground", "darkRing", "radius",
];

function isValidPreset(value: unknown): value is ThemePreset {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  if (typeof p.id !== "string" || typeof p.name !== "string") return false;
  if (typeof p.description !== "string") return false;
  const theme = p.theme as Record<string, unknown> | undefined;
  if (typeof theme !== "object" || theme === null) return false;
  return REQUIRED_THEME_KEYS.every((key) => typeof theme[key] === "string");
}

/**
 * Parse and validate an exported templates file (a JSON array of presets).
 * Entries without an id get a throwaway one (ids are server-generated on
 * import anyway); malformed entries are dropped rather than failing the
 * whole file. Returns [] for non-JSON or a non-array payload.
 */
export function parseImportedPresets(raw: string): ThemePreset[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const presets: ThemePreset[] = [];
  parsed.forEach((entry, index) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    const candidate: ThemePreset = {
      id: typeof e.id === "string" ? e.id : `import-${index + 1}`,
      name: typeof e.name === "string" ? e.name : "",
      description: typeof e.description === "string" ? e.description : "",
      theme: e.theme as ThemePreviewData,
    };
    if (isValidPreset(candidate)) presets.push(candidate);
  });
  return presets;
}

/** What an import should do with each file entry, computed up front. */
export interface ImportPlan {
  toCreate: ThemePreset[];
  toOverwrite: Array<{ preset: ThemePreset; existing: ThemePreset }>;
  /** Entries dropped because the 10-template cap has no room for new ones. */
  skipped: number;
}

/**
 * Split imported presets into creates / overwrites (name collision, matched
 * case-insensitively, including within the file itself — last occurrence wins)
 * / skips (cap would be exceeded). Pure: no I/O, so it's unit-testable.
 */
export function planImport(imported: ThemePreset[], existing: ThemePreset[]): ImportPlan {
  const byName = new Map<string, ThemePreset>();
  for (const preset of imported) {
    byName.set(preset.name.trim().toLowerCase(), preset);
  }
  const existingByName = new Map(
    existing.map((p) => [p.name.trim().toLowerCase(), p]),
  );
  const toCreate: ThemePreset[] = [];
  const toOverwrite: ImportPlan["toOverwrite"] = [];
  let skipped = 0;
  let createSlots = Math.max(0, MAX_CUSTOM_PRESETS - existing.length);
  for (const preset of byName.values()) {
    const existingPreset = existingByName.get(preset.name.trim().toLowerCase());
    if (existingPreset) {
      toOverwrite.push({ preset, existing: existingPreset });
    } else if (createSlots > 0) {
      toCreate.push(preset);
      createSlots -= 1;
    } else {
      skipped += 1;
    }
  }
  return { toCreate, toOverwrite, skipped };
}

/** Download the current custom templates as a JSON file (backup / sharing). */
export function exportPresetsToFile(presets: ThemePreset[]): void {
  const payload = JSON.stringify(presets, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `theme-templates-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Read the legacy localStorage store (corrupt/legacy data is dropped). */
function readLegacyPresets(): ThemePreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPreset).slice(0, MAX_CUSTOM_PRESETS);
  } catch {
    return [];
  }
}

/** Unwrap the collection payload (list endpoints return { data, pagination }). */
function unwrapCollectionRows(
  payload: unknown,
): Array<{ id: string; name: string; description: string; palette: unknown }> {
  if (Array.isArray(payload)) return payload as Array<{ id: string; name: string; description: string; palette: unknown }>;
  if (payload && typeof payload === "object" && "data" in payload && Array.isArray((payload as { data: unknown }).data)) {
    return (payload as { data: Array<{ id: string; name: string; description: string; palette: unknown }> }).data;
  }
  return [];
}

/** Map a theme_presets row onto the client ThemePreset shape (dropping invalid rows). */
function rowToPreset(row: { id: string; name: string; description: string; palette: unknown }): ThemePreset | null {
  const preset: ThemePreset = { id: row.id, name: row.name, description: row.description, theme: row.palette as ThemePreviewData };
  return isValidPreset(preset) ? preset : null;
}

/**
 * One-time migration: upload palettes saved by the old localStorage version
 * and clear the key. Returns how many were migrated. No-op when the server
 * already has templates (the server is authoritative, so a second device
 * never re-uploads the same palettes as duplicates).
 */
export async function migrateLegacyLocalPresets(): Promise<number> {
  const legacy = readLegacyPresets();
  if (legacy.length === 0) return 0;
  let migrated = 0;
  for (const preset of legacy) {
    const res = await api.themePresets.create({
      name: preset.name,
      description: preset.description,
      palette: preset.theme as Record<string, string>,
    });
    if (res.success) migrated += 1;
  }
  try {
    localStorage.removeItem(CUSTOM_PRESETS_KEY);
  } catch {
    // Storage unavailable — the key will simply be ignored on later loads.
  }
  return migrated;
}

/**
 * Load the admin's saved custom templates from the server, migrating any
 * legacy localStorage palettes on first use (server list empty → upload →
 * clear). Returns [] on auth/network failure so the grid degrades gracefully.
 */
export async function loadCustomPresets(): Promise<ThemePreset[]> {
  const res = await api.themePresets.list();
  if (!res.success) return [];
  const rows = unwrapCollectionRows(res.data);
  let presets = rows.map(rowToPreset).filter((p): p is ThemePreset => p !== null);
  if (presets.length === 0) {
    const migrated = await migrateLegacyLocalPresets();
    if (migrated > 0) {
      const refreshed = await api.themePresets.list();
      if (refreshed.success) {
        presets = unwrapCollectionRows(refreshed.data)
          .map(rowToPreset)
          .filter((p): p is ThemePreset => p !== null);
      }
    }
  }
  return presets;
}

export const MAX_CUSTOM_TEMPLATES = MAX_CUSTOM_PRESETS;

const COLOR_KEYS: (keyof ThemePreviewData)[] = [
  "lightPrimary", "lightAccent", "lightBackground", "lightForeground", "lightCard",
  "lightBorder", "lightMuted", "lightMutedForeground", "lightRing",
  "darkPrimary", "darkAccent", "darkBackground", "darkForeground", "darkCard",
  "darkBorder", "darkMuted", "darkMutedForeground", "darkRing", "radius",
];

/**
 * Returns the preset whose palette exactly matches `theme`, or null (custom).
 * Accepts the merged built-in + saved list so saved templates are recognized
 * too — pass `[...THEME_PRESETS, ...customPresets]` from the caller.
 */
export function findActivePreset(
  theme: ThemePreviewData,
  presets: ThemePreset[] = THEME_PRESETS,
): ThemePreset | null {
  for (const preset of presets) {
    if (COLOR_KEYS.every((key) => preset.theme[key] === theme[key])) return preset;
  }
  return null;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "modern-indigo",
    name: "Modern Indigo",
    description: "Balanced blue-indigo with soft neutral surfaces",
    theme: {
      mode: "light",
      lightPrimary: "204 92% 42%", lightAccent: "189 90% 38%", lightBackground: "220 30% 97%",
      lightForeground: "222 40% 10%", lightCard: "0 0% 100%", lightBorder: "220 18% 84%",
      lightMuted: "220 20% 91%", lightMutedForeground: "220 15% 42%", lightRing: "204 92% 45%",
      darkPrimary: "204 92% 62%", darkAccent: "189 95% 53%", darkBackground: "222 48% 6%",
      darkForeground: "210 30% 96%", darkCard: "222 40% 9%", darkBorder: "220 22% 18%",
      darkMuted: "222 32% 12%", darkMutedForeground: "215 18% 72%", darkRing: "204 92% 62%",
      radius: "0.9rem",
    },
  },
  {
    id: "minimal-mono",
    name: "Minimal Mono",
    description: "Clean grayscale — typography-first, zero color noise",
    theme: {
      mode: "light",
      lightPrimary: "220 10% 20%", lightAccent: "220 8% 38%", lightBackground: "220 20% 98%",
      lightForeground: "220 15% 8%", lightCard: "0 0% 100%", lightBorder: "220 12% 88%",
      lightMuted: "220 14% 93%", lightMutedForeground: "220 10% 45%", lightRing: "220 10% 35%",
      darkPrimary: "220 8% 90%", darkAccent: "220 6% 74%", darkBackground: "220 18% 7%",
      darkForeground: "220 12% 95%", darkCard: "220 16% 10%", darkBorder: "220 12% 20%",
      darkMuted: "220 14% 14%", darkMutedForeground: "220 10% 70%", darkRing: "220 8% 85%",
      radius: "0.5rem",
    },
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    description: "Vivid azure on deep-water surfaces",
    theme: {
      mode: "light",
      lightPrimary: "217 91% 55%", lightAccent: "199 89% 48%", lightBackground: "210 40% 97%",
      lightForeground: "222 47% 11%", lightCard: "0 0% 100%", lightBorder: "214 32% 84%",
      lightMuted: "210 33% 92%", lightMutedForeground: "215 25% 45%", lightRing: "217 91% 50%",
      darkPrimary: "217 91% 65%", darkAccent: "199 89% 55%", darkBackground: "222 47% 8%",
      darkForeground: "213 40% 97%", darkCard: "222 45% 11%", darkBorder: "217 30% 20%",
      darkMuted: "217 33% 14%", darkMutedForeground: "215 25% 72%", darkRing: "217 91% 60%",
      radius: "0.75rem",
    },
  },
  {
    id: "emerald-forest",
    name: "Emerald Forest",
    description: "Fresh greens with a nature-inspired calm",
    theme: {
      mode: "light",
      lightPrimary: "152 76% 40%", lightAccent: "162 88% 35%", lightBackground: "150 30% 97%",
      lightForeground: "160 40% 10%", lightCard: "0 0% 100%", lightBorder: "155 25% 84%",
      lightMuted: "152 28% 92%", lightMutedForeground: "155 20% 42%", lightRing: "152 76% 45%",
      darkPrimary: "152 76% 55%", darkAccent: "162 88% 48%", darkBackground: "160 45% 6%",
      darkForeground: "155 30% 95%", darkCard: "160 40% 9%", darkBorder: "155 28% 18%",
      darkMuted: "155 30% 12%", darkMutedForeground: "155 22% 70%", darkRing: "152 76% 60%",
      radius: "1rem",
    },
  },
  {
    id: "sunset-warm",
    name: "Sunset Warm",
    description: "Amber and orange — energetic, friendly, creative",
    theme: {
      mode: "light",
      lightPrimary: "24 95% 50%", lightAccent: "38 95% 50%", lightBackground: "35 40% 97%",
      lightForeground: "25 50% 12%", lightCard: "0 0% 100%", lightBorder: "30 35% 85%",
      lightMuted: "33 38% 93%", lightMutedForeground: "30 25% 45%", lightRing: "24 95% 55%",
      darkPrimary: "24 95% 62%", darkAccent: "38 95% 60%", darkBackground: "25 45% 7%",
      darkForeground: "35 40% 96%", darkCard: "28 40% 11%", darkBorder: "30 30% 20%",
      darkMuted: "30 32% 14%", darkMutedForeground: "30 22% 72%", darkRing: "24 95% 65%",
      radius: "0.875rem",
    },
  },
  {
    id: "violet-cyber",
    name: "Violet Cyber",
    description: "Electric purple for a bold, modern edge",
    theme: {
      mode: "light",
      lightPrimary: "262 83% 58%", lightAccent: "291 70% 52%", lightBackground: "250 40% 97%",
      lightForeground: "258 50% 10%", lightCard: "0 0% 100%", lightBorder: "258 30% 85%",
      lightMuted: "255 35% 93%", lightMutedForeground: "258 25% 45%", lightRing: "262 83% 60%",
      darkPrimary: "262 83% 68%", darkAccent: "291 70% 62%", darkBackground: "258 45% 7%",
      darkForeground: "255 35% 96%", darkCard: "260 40% 11%", darkBorder: "258 28% 20%",
      darkMuted: "258 32% 14%", darkMutedForeground: "258 22% 72%", darkRing: "262 83% 70%",
      radius: "1.125rem",
    },
  },
  {
    id: "rose",
    name: "Rose",
    description: "Warm pink-red with a friendly, personable tone",
    theme: {
      mode: "light",
      lightPrimary: "346 84% 56%", lightAccent: "16 90% 55%", lightBackground: "350 35% 97%",
      lightForeground: "340 40% 10%", lightCard: "0 0% 100%", lightBorder: "345 28% 85%",
      lightMuted: "348 32% 93%", lightMutedForeground: "345 20% 45%", lightRing: "346 84% 60%",
      darkPrimary: "346 84% 66%", darkAccent: "16 90% 62%", darkBackground: "345 45% 7%",
      darkForeground: "340 35% 96%", darkCard: "345 40% 11%", darkBorder: "345 28% 20%",
      darkMuted: "345 30% 14%", darkMutedForeground: "345 22% 72%", darkRing: "346 84% 70%",
      radius: "0.875rem",
    },
  },
  {
    id: "midnight-dark",
    name: "Midnight Dark",
    description: "Deep navy, dark-first aesthetic for portfolios",
    theme: {
      mode: "light",
      lightPrimary: "222 100% 60%", lightAccent: "199 100% 55%", lightBackground: "222 40% 97%",
      lightForeground: "222 50% 10%", lightCard: "0 0% 100%", lightBorder: "220 30% 85%",
      lightMuted: "222 35% 92%", lightMutedForeground: "222 25% 45%", lightRing: "222 100% 55%",
      darkPrimary: "222 100% 68%", darkAccent: "199 100% 60%", darkBackground: "226 45% 5%",
      darkForeground: "213 45% 97%", darkCard: "224 42% 9%", darkBorder: "222 30% 18%",
      darkMuted: "222 34% 12%", darkMutedForeground: "216 25% 72%", darkRing: "222 100% 65%",
      radius: "0.6rem",
    },
  },
  {
    id: "slate-professional",
    name: "Slate Professional",
    description: "Restrained blue-gray for corporate polish",
    theme: {
      mode: "light",
      lightPrimary: "221 65% 45%", lightAccent: "200 60% 40%", lightBackground: "220 25% 98%",
      lightForeground: "222 35% 9%", lightCard: "0 0% 100%", lightBorder: "221 20% 86%",
      lightMuted: "220 22% 93%", lightMutedForeground: "221 15% 42%", lightRing: "221 65% 50%",
      darkPrimary: "221 65% 62%", darkAccent: "200 60% 55%", darkBackground: "222 32% 7%",
      darkForeground: "214 35% 96%", darkCard: "221 30% 10%", darkBorder: "221 22% 19%",
      darkMuted: "221 26% 13%", darkMutedForeground: "218 20% 70%", darkRing: "221 65% 65%",
      radius: "0.625rem",
    },
  },
];

/**
 * Mini dual light/dark swatch shown on each preset card — a quick visual
 * fingerprint of the palette using its background, card, primary, and accent.
 */
function PresetSwatch({ theme }: { theme: ThemePreviewData }) {
  const strip = (mode: "light" | "dark") => {
    const bg = mode === "light" ? theme.lightBackground : theme.darkBackground;
    const card = mode === "light" ? theme.lightCard : theme.darkCard;
    const border = mode === "light" ? theme.lightBorder : theme.darkBorder;
    const fg = mode === "light" ? theme.lightForeground : theme.darkForeground;
    const muted = mode === "light" ? theme.lightMuted : theme.darkMuted;
    const primary = mode === "light" ? theme.lightPrimary : theme.darkPrimary;
    const accent = mode === "light" ? theme.lightAccent : theme.darkAccent;
    return (
      <div className="flex-1 h-11 rounded-md p-1.5 border flex items-center gap-1.5" style={{ background: `hsl(${bg})`, borderColor: `hsl(${border})` }}>
        <div className="flex-1 rounded-sm h-full flex items-center gap-1 px-1.5" style={{ background: `hsl(${card})` }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${primary})` }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${accent})` }} />
          <span className="h-1 rounded-full flex-1" style={{ background: `hsl(${fg})`, opacity: 0.35 }} />
          <span className="h-1 rounded-full w-3" style={{ background: `hsl(${muted})`, border: `1px solid hsl(${border})` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-1.5">
      {strip("light")}
      {strip("dark")}
    </div>
  );
}

interface PresetPickerProps {
  activePresetId: string | null;
  onApply: (preset: ThemePreset) => void;
  /** Saved custom templates to show alongside the built-ins (newest first). */
  customPresets?: ThemePreset[];
  /** When provided, custom templates render a delete button that calls this. */
  onDeleteCustom?: (id: string) => void;
}

/** Selectable grid of theme templates shown above the manual color controls. */
export function PresetPicker({
  activePresetId,
  onApply,
  customPresets = [],
  onDeleteCustom,
}: PresetPickerProps) {
  const allPresets = [...customPresets, ...THEME_PRESETS];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {allPresets.map((preset) => {
        const active = preset.id === activePresetId;
        const isCustom = customPresets.some((p) => p.id === preset.id);
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApply(preset)}
            aria-pressed={active}
            aria-label={`Apply ${preset.name} template`}
            className={cn(
              "relative text-left rounded-xl border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "border-primary ring-2 ring-primary/40 bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/40",
            )}
          >
            {active && (
              <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Check className="h-3 w-3" aria-hidden="true" />
              </span>
            )}
            {isCustom && onDeleteCustom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCustom(preset.id);
                }}
                aria-label={`Delete ${preset.name} template`}
                className="absolute top-2 left-2 h-6 w-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <PresetSwatch theme={preset.theme} />
            <div className="mt-2">
              <div className="text-sm font-medium">
                {preset.name}
                {isCustom && (
                  <span className="ml-1.5 align-middle text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1 py-px">
                    Custom
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{preset.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
