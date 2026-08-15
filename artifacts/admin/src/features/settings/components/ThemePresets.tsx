import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
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

const COLOR_KEYS: (keyof ThemePreviewData)[] = [
  "lightPrimary", "lightAccent", "lightBackground", "lightForeground", "lightCard",
  "lightBorder", "lightMuted", "lightMutedForeground", "lightRing",
  "darkPrimary", "darkAccent", "darkBackground", "darkForeground", "darkCard",
  "darkBorder", "darkMuted", "darkMutedForeground", "darkRing", "radius",
];

/** Returns the preset whose palette exactly matches `theme`, or null (custom). */
export function findActivePreset(theme: ThemePreviewData): ThemePreset | null {
  for (const preset of THEME_PRESETS) {
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
}

/** Selectable grid of theme templates shown above the manual color controls. */
export function PresetPicker({ activePresetId, onApply }: PresetPickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {THEME_PRESETS.map((preset) => {
        const active = preset.id === activePresetId;
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
            <PresetSwatch theme={preset.theme} />
            <div className="mt-2">
              <div className="text-sm font-medium">{preset.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{preset.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
