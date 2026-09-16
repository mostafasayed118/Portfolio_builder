import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEME_PRESETS, type ThemePreset } from "./ThemePresetData";
import type { ThemePreviewData } from "./ThemePreview";

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
