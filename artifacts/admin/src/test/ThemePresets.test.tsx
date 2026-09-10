import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  findActivePreset,
  PresetPicker,
  THEME_PRESETS,
  loadCustomPresets,
  migrateLegacyLocalPresets,
  parseImportedPresets,
  planImport,
  exportPresetsToFile,
  type ThemePreset,
} from "@/features/settings/components/ThemePresets";
import type { ThemePreviewData } from "@/features/settings/components/ThemePreview";

const { mockPresetsList, mockPresetsCreate } = vi.hoisted(() => ({
  mockPresetsList: vi.fn(),
  mockPresetsCreate: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    themePresets: {
      list: mockPresetsList,
      create: mockPresetsCreate,
    },
  },
}));

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

const CUSTOM: ThemePreset = {
  id: "custom-1",
  name: "My Teal",
  description: "Custom palette saved on Aug 15, 2026",
  theme: { ...BASE, lightPrimary: "175 84% 38%" },
};

const PAGINATION = { total: 0, limit: 50, offset: 0, hasMore: false };

function serverRow(preset: ThemePreset) {
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    palette: preset.theme,
    sort_order: null,
    user_id: null,
    deleted_at: null,
    created_at: "2026-08-15T00:00:00Z",
    updated_at: "2026-08-15T00:00:00Z",
  };
}

describe("loadCustomPresets (server-backed)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("maps server rows onto the client ThemePreset shape", async () => {
    mockPresetsList.mockResolvedValue({
      success: true,
      data: { data: [serverRow(CUSTOM)], pagination: { ...PAGINATION, total: 1 } },
    });
    const loaded = await loadCustomPresets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("custom-1");
    expect(loaded[0].theme.lightPrimary).toBe("175 84% 38%");
  });

  it("returns [] when the server response fails (graceful degradation)", async () => {
    mockPresetsList.mockResolvedValue({ success: false, message: "Unauthorized" });
    expect(await loadCustomPresets()).toEqual([]);
  });

  it("returns [] for an empty server list with no legacy data", async () => {
    mockPresetsList.mockResolvedValue({ success: true, data: { data: [], pagination: PAGINATION } });
    expect(await loadCustomPresets()).toEqual([]);
  });

  it("drops malformed rows instead of crashing the grid", async () => {
    mockPresetsList.mockResolvedValue({
      success: true,
      data: {
        data: [
          serverRow(CUSTOM),
          { ...serverRow(CUSTOM), id: "bad", palette: { mode: "light" } },
        ],
        pagination: { ...PAGINATION, total: 2 },
      },
    });
    const loaded = await loadCustomPresets();
    expect(loaded).toHaveLength(1);
  });

  it("finds a saved template via findActivePreset when merged", async () => {
    expect(findActivePreset(CUSTOM.theme, [CUSTOM])?.id).toBe("custom-1");
    expect(findActivePreset(CUSTOM.theme)).toBeNull(); // built-ins only → no match
  });
});

describe("migrateLegacyLocalPresets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("uploads legacy localStorage palettes once and clears the key", async () => {
    localStorage.setItem("pf-theme-custom-presets-v1", JSON.stringify([CUSTOM]));
    mockPresetsCreate.mockResolvedValue({ success: true });
    const count = await migrateLegacyLocalPresets();
    expect(count).toBe(1);
    expect(mockPresetsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "My Teal", palette: CUSTOM.theme }),
    );
    expect(localStorage.getItem("pf-theme-custom-presets-v1")).toBeNull();
  });

  it("is a no-op when no legacy palettes exist", async () => {
    expect(await migrateLegacyLocalPresets()).toBe(0);
    expect(mockPresetsCreate).not.toHaveBeenCalled();
  });
});

describe("parseImportedPresets", () => {
  it("round-trips a valid exported file (ids preserved)", () => {
    const parsed = parseImportedPresets(JSON.stringify([CUSTOM]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("custom-1");
    expect(parsed[0].theme.lightPrimary).toBe("175 84% 38%");
  });

  it("accepts entries without an id and assigns a throwaway one", () => {
    const noId = { name: CUSTOM.name, description: CUSTOM.description, theme: CUSTOM.theme };
    const parsed = parseImportedPresets(JSON.stringify([noId]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("import-1");
    expect(parsed[0].name).toBe("My Teal");
  });

  it("drops malformed entries instead of failing the whole file", () => {
    const raw = JSON.stringify([
      CUSTOM,
      { name: "Broken" },
      { id: "x", name: "No theme", description: "", theme: { mode: "light" } },
      "not-an-object",
    ]);
    const parsed = parseImportedPresets(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("My Teal");
  });

  it("returns [] for non-JSON or a non-array payload", () => {
    expect(parseImportedPresets("not json")).toEqual([]);
    expect(parseImportedPresets(JSON.stringify({ not: "an array" }))).toEqual([]);
    expect(parseImportedPresets("")).toEqual([]);
  });
});

describe("planImport", () => {
  const fresh: ThemePreset = { id: "file-1", name: "Fresh Teal", description: "", theme: { ...BASE, lightPrimary: "10 50% 40%" } };
  const colliding: ThemePreset = { id: "file-2", name: "My Teal", description: "from file", theme: { ...BASE, lightPrimary: "200 50% 40%" } };

  it("splits entries into creates and overwrites by name", () => {
    const plan = planImport([fresh, colliding], [CUSTOM]);
    expect(plan.toCreate).toEqual([fresh]);
    expect(plan.toOverwrite).toEqual([{ preset: colliding, existing: CUSTOM }]);
    expect(plan.skipped).toBe(0);
  });

  it("matches existing names case-insensitively", () => {
    const plan = planImport([{ ...colliding, name: "my teal" }], [CUSTOM]);
    expect(plan.toOverwrite).toHaveLength(1);
    expect(plan.toCreate).toHaveLength(0);
  });

  it("dedupes names inside the file itself (last occurrence wins)", () => {
    const plan = planImport([colliding, { ...colliding, description: "newer" }], []);
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0].description).toBe("newer");
  });

  it("skips new templates when the 10-template cap has no room, but still overwrites", () => {
    const full = Array.from({ length: 10 }, (_, i) => ({
      id: `existing-${i}`,
      name: `Existing ${i}`,
      description: "",
      theme: { ...BASE },
    })) as ThemePreset[];
    const plan = planImport([colliding, fresh], full);
    expect(plan.toOverwrite).toHaveLength(0); // "My Teal" is NOT in the full list
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.skipped).toBe(2);

    // With a collision present, the overwrite still goes through.
    const withCollision = [...full, CUSTOM];
    const plan2 = planImport([colliding, fresh], withCollision);
    expect(plan2.toOverwrite).toHaveLength(1);
    expect(plan2.toCreate).toHaveLength(0);
    expect(plan2.skipped).toBe(1);
  });
});

describe("exportPresetsToFile", () => {
  it("downloads the presets as a dated JSON file", () => {
    const createUrl = vi.fn(() => "blob:mock");
    const revokeUrl = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    exportPresetsToFile([CUSTOM]);

    expect(createUrl).toHaveBeenCalledTimes(1);
    const anchor = click.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toMatch(/^theme-templates-\d{4}-\d{2}-\d{2}\.json$/);
    expect(anchor.href).toBe("blob:mock");
    expect(revokeUrl).toHaveBeenCalledWith("blob:mock");

    click.mockRestore();
    vi.unstubAllGlobals();
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

  it("renders custom templates alongside built-ins with a Custom badge", () => {
    render(<PresetPicker activePresetId={null} onApply={() => {}} customPresets={[CUSTOM]} onDeleteCustom={() => {}} />);
    expect(screen.getByText("My Teal")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByText("Modern Indigo")).toBeInTheDocument();
  });

  it("applies a custom template and reports deletion without applying it", async () => {
    const onApply = vi.fn();
    const onDelete = vi.fn();
    render(<PresetPicker activePresetId={null} onApply={onApply} customPresets={[CUSTOM]} onDeleteCustom={onDelete} />);

    await userEvent.click(screen.getByRole("button", { name: "Apply My Teal template" }));
    expect(onApply).toHaveBeenCalledWith(CUSTOM);

    await userEvent.click(screen.getByRole("button", { name: "Delete My Teal template" }));
    expect(onDelete).toHaveBeenCalledWith("custom-1");
    expect(onApply).toHaveBeenCalledTimes(1); // delete never triggers apply
  });
});
