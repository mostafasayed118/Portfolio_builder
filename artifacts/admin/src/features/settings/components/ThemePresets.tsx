import { api } from "@/lib/api-client";
import type { ThemePreviewData } from "./ThemePreview";
import { THEME_PRESETS, type ThemePreset } from "./ThemePresetData";

/**
 * Preset theme templates for the admin Theme Manager — the logic module.
 *
 * The built-in palette data (`THEME_PRESETS`, the `ThemePreset` type) lives in
 * `ThemePresetData.ts` and the template-grid picker in `ThemePresetPicker.tsx`;
 * both are re-exported here so this module's public surface is unchanged.
 */
export { THEME_PRESETS } from "./ThemePresetData";
export type { ThemePreset } from "./ThemePresetData";
export { PresetPicker } from "./ThemePresetPicker";

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
