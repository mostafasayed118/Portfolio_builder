import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { findActivePreset, PresetPicker, THEME_PRESETS } from "@/features/settings/components/ThemePresets";
import type { ThemePreviewData } from "@/features/settings/components/ThemePreview";

const BASE: ThemePreviewData = {
  mode: "light",
  lightPrimary: "204 92% 42%", lightAccent: "189 90% 38%", lightBackground: "220 30% 97%",
  lightForeground: "222 40% 10%", lightCard: "0 0% 100%", lightBorder: "220 18% 84%",
  lightMuted: "220 20% 91%", lightMutedForeground: "220 15% 42%", lightRing: "204 92% 45%",
  darkPrimary: "204 92% 62%", darkAccent: "189 95% 53%", darkBackground: "222 48% 6%",
  darkForeground: "210 30% 96%", darkCard: "222 40% 9%", darkBorder: "220 22% 18%",
  darkMuted: "222 32% 12%", darkMutedForeground: "215 18% 72%", darkRing: "204 92% 62%",
  radius: "0.9rem",
};

describe("findActivePreset", () => {
  it("returns the preset whose palette exactly matches (ignoring mode)", () => {
    // Modern Indigo with a different `mode` should still match.
    const match = findActivePreset({ ...BASE, mode: "dark" });
    expect(match?.id).toBe("modern-indigo");
  });

  it("returns null when any color diverges (custom theme)", () => {
    const custom = { ...BASE, lightPrimary: "0 0% 0%" };
    expect(findActivePreset(custom)).toBeNull();
  });

  it("returns null when radius diverges", () => {
    const custom = { ...BASE, radius: "0.25rem" };
    expect(findActivePreset(custom)).toBeNull();
  });
});

describe("PresetPicker", () => {
  it("renders every template with its name", () => {
    render(<PresetPicker activePresetId={null} onApply={() => {}} />);
    for (const preset of THEME_PRESETS) {
      expect(screen.getByText(preset.name)).toBeInTheDocument();
    }
  });

  it("calls onApply with the preset when a card is clicked", async () => {
    const onApply = vi.fn();
    render(<PresetPicker activePresetId={null} onApply={onApply} />);
    const ocean = THEME_PRESETS.find((p) => p.id === "ocean-blue")!;
    await userEvent.click(screen.getByRole("button", { name: `Apply ${ocean.name} template` }));
    expect(onApply).toHaveBeenCalledWith(ocean);
  });

  it("marks the active preset as pressed", () => {
    render(<PresetPicker activePresetId="rose" onApply={() => {}} />);
    const rose = screen.getByRole("button", { name: "Apply Rose template" });
    expect(rose.getAttribute("aria-pressed")).toBe("true");
    const indigo = screen.getByRole("button", { name: "Apply Modern Indigo template" });
    expect(indigo.getAttribute("aria-pressed")).toBe("false");
  });
});
