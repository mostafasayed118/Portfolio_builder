import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeManager } from "@/features/settings";

const { mockThemeGet, mockThemeUpdate, mockToastSuccess, mockPresetsList, mockPresetsCreate, mockPresetsUpdate, mockPresetsDelete } = vi.hoisted(
  () => ({
    mockThemeGet: vi.fn(),
    mockThemeUpdate: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockPresetsList: vi.fn(),
    mockPresetsCreate: vi.fn(),
    mockPresetsUpdate: vi.fn(),
    mockPresetsDelete: vi.fn(),
  }),
);

vi.mock("@/lib/api-client", () => ({
  api: {
    themeSettings: {
      get: mockThemeGet,
      update: mockThemeUpdate,
    },
    themePresets: {
      list: mockPresetsList,
      create: mockPresetsCreate,
      update: mockPresetsUpdate,
      delete: mockPresetsDelete,
    },
  },
}));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return {
    ...actual,
    useToast: () => ({ toast: mockToastSuccess }),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

/** In-memory "server" used by the presets mocks so save/delete flows round-trip. */
let presetRows: Array<Record<string, unknown>> = [];

/** Full palette used by imported files (mirrors the row palette shape). */
function mockThemeDataPalette(): Record<string, string> {
  return {
    mode: "dark",
    lightPrimary: "175 84% 38%", lightAccent: "189 90% 38%", lightBackground: "220 30% 97%",
    lightForeground: "222 40% 10%", lightCard: "0 0% 100%", lightBorder: "220 18% 84%",
    lightMuted: "220 20% 91%", lightMutedForeground: "220 15% 42%", lightRing: "175 84% 42%",
    darkPrimary: "175 84% 62%", darkAccent: "189 95% 53%", darkBackground: "222 48% 6%",
    darkForeground: "210 30% 96%", darkCard: "222 40% 9%", darkBorder: "220 22% 18%",
    darkMuted: "222 32% 12%", darkMutedForeground: "215 18% 72%", darkRing: "175 84% 62%",
    radius: "0.5rem",
  };
}

function presetRow(overrides: Record<string, unknown>) {
  return {
    id: "uuid-custom-1",
    name: "My Teal",
    description: "Custom palette saved on Aug 15, 2026",
    palette: {
      mode: "dark",
      lightPrimary: "175 84% 38%", lightAccent: "189 90% 38%", lightBackground: "220 30% 97%",
      lightForeground: "222 40% 10%", lightCard: "0 0% 100%", lightBorder: "220 18% 84%",
      lightMuted: "220 20% 91%", lightMutedForeground: "220 15% 42%", lightRing: "175 84% 42%",
      darkPrimary: "175 84% 62%", darkAccent: "189 95% 53%", darkBackground: "222 48% 6%",
      darkForeground: "210 30% 96%", darkCard: "222 40% 9%", darkBorder: "220 22% 18%",
      darkMuted: "222 32% 12%", darkMutedForeground: "215 18% 72%", darkRing: "175 84% 62%",
      radius: "0.5rem",
    },
    sort_order: null,
    user_id: null,
    deleted_at: null,
    created_at: "2026-08-15T00:00:00Z",
    updated_at: "2026-08-15T00:00:00Z",
    ...overrides,
  };
}

const mockThemeData = {
  mode: "dark",
  light_primary: "204 92% 42%",
  light_accent: "189 90% 38%",
  light_background: "220 30% 97%",
  light_foreground: "222 40% 10%",
  light_card: "0 0% 100%",
  light_border: "220 18% 84%",
  light_muted: "220 20% 91%",
  light_muted_foreground: "220 15% 42%",
  light_ring: "204 92% 45%",
  dark_primary: "204 92% 62%",
  dark_accent: "189 95% 53%",
  dark_background: "222 48% 6%",
  dark_foreground: "210 30% 96%",
  dark_card: "222 40% 9%",
  dark_border: "220 22% 18%",
  dark_muted: "222 32% 12%",
  dark_muted_foreground: "215 18% 72%",
  dark_ring: "204 92% 62%",
  radius: "0.5rem",
};

describe("ThemeManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    presetRows = [];
    mockThemeGet.mockResolvedValue({ success: true, data: mockThemeData });
    mockThemeUpdate.mockResolvedValue({ success: true });
    mockPresetsList.mockImplementation(async () => ({
      success: true,
      data: { data: presetRows, pagination: { total: presetRows.length, limit: 50, offset: 0, hasMore: false } },
    }));
    mockPresetsCreate.mockImplementation(async (input: { name: string; description?: string; palette: Record<string, string> }) => {
      presetRows = [presetRow({ name: input.name, description: input.description, palette: input.palette }), ...presetRows];
      return { success: true };
    });
    mockPresetsUpdate.mockImplementation(async (id: string, input: { description?: string; palette?: Record<string, string> }) => {
      const row = presetRows.find((r) => r.id === id);
      if (row) Object.assign(row, input);
      return { success: true };
    });
    mockPresetsDelete.mockImplementation(async (id: string) => {
      presetRows = presetRows.filter((r) => r.id !== id);
      return { success: true };
    });
  });

  it("renders form fields correctly", async () => {
    renderWithProviders(<ThemeManager />);

    expect(await screen.findByText("Theme Manager")).toBeInTheDocument();
    expect(screen.getByText("Light Mode Colors")).toBeInTheDocument();
    expect(screen.getByText("Dark Mode Colors")).toBeInTheDocument();
    expect(screen.getByText("Border Radius")).toBeInTheDocument();
  });

  it("pre-fills colors from fetched theme data", async () => {
    renderWithProviders(<ThemeManager />);

    await expect(screen.findByDisplayValue("204 92% 42%")).resolves.toBeInTheDocument();
    expect(screen.getByDisplayValue("222 48% 6%")).toBeInTheDocument();
    expect(screen.getByText("0.5rem")).toBeInTheDocument();
  });

  it("calls update on save", async () => {
    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockThemeUpdate).toHaveBeenCalled();
    });
  });

  it("shows success toast after save", async () => {
    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Theme saved" }),
      );
    });
  });

  it("renders the Templates section with all preset cards", async () => {
    renderWithProviders(<ThemeManager />);

    await screen.findByText("Theme Manager");
    expect(screen.getByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("Modern Indigo")).toBeInTheDocument();
    expect(screen.getByText("Ocean Blue")).toBeInTheDocument();
    expect(screen.getByText("Minimal Mono")).toBeInTheDocument();
    expect(screen.getByText("Sunset Warm")).toBeInTheDocument();
  });

  it("reports custom colors when the fetched palette matches no preset", async () => {
    // mockThemeData uses radius 0.5rem, which differs from every preset.
    renderWithProviders(<ThemeManager />);

    await screen.findByText("Theme Manager");
    expect(screen.getByText(/currently using/i)).toBeInTheDocument();
    expect(screen.getByText("custom colors")).toBeInTheDocument();
  });

  it("randomize generates a fresh palette and pre-fills the fields", async () => {
    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    await userEvent.click(screen.getByRole("button", { name: /randomize/i }));

    // The original light primary value is replaced by the generated palette.
    await waitFor(() => {
      expect(screen.queryByDisplayValue("204 92% 42%")).not.toBeInTheDocument();
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Random Analogous palette generated" }),
    );
    // Mode and radius survive the roll: the radius text is still the saved one.
    expect(screen.getByText("0.5rem")).toBeInTheDocument();
  });

  it("applies a deterministic palette from a seed and regenerates it identically", async () => {
    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");
    const primaryHex = () => (screen.getAllByLabelText("Primary")[0] as HTMLInputElement).value;

    await userEvent.type(screen.getByLabelText("Palette seed"), "abc");
    await userEvent.click(screen.getByRole("button", { name: /apply seed/i }));
    const first = primaryHex();

    // Same seed, applied again → byte-identical palette.
    await userEvent.click(screen.getByRole("button", { name: /apply seed/i }));
    expect(primaryHex()).toBe(first);
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Palette applied from seed" }),
    );
  });

  it("copies the current seed to the clipboard for sharing", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    try {
      renderWithProviders(<ThemeManager />);

      await screen.findByDisplayValue("204 92% 42%");

      await userEvent.type(screen.getByLabelText("Palette seed"), "shared-seed-42");
      await userEvent.click(screen.getByRole("button", { name: /^copy$/i }));

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith("shared-seed-42");
      });
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Seed copied" }),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("cycles the harmony family on each Randomize click", async () => {
    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    await userEvent.click(screen.getByRole("button", { name: /randomize/i }));
    await userEvent.click(screen.getByRole("button", { name: /randomize/i }));

    // First click: analogous, second click: complementary.
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Random Analogous palette generated" }),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Random Complementary palette generated" }),
    );
  });

  it("saves the current palette as a named custom template via the API", async () => {
    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    await userEvent.type(screen.getByLabelText("Name for the new template"), "My Teal");
    await userEvent.click(screen.getByRole("button", { name: /save as template/i }));

    await waitFor(() => {
      expect(mockPresetsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "My Teal" }),
      );
    });
    // Refetch picks the saved template up from the (mocked) server list.
    expect((await screen.findAllByText("My Teal")).length).toBeGreaterThan(0);
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Template saved" }),
    );
  });

  it("offers to overwrite instead of stacking when the template name already exists", async () => {
    presetRows = [presetRow({})];
    mockPresetsCreate.mockResolvedValue({
      success: false,
      code: "DUPLICATE_NAME",
      existingId: "uuid-custom-1",
    });

    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    await userEvent.type(screen.getByLabelText("Name for the new template"), "My Teal");
    await userEvent.click(screen.getByRole("button", { name: /save as template/i }));

    // The overwrite dialog appears instead of creating a second template.
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain('Overwrite "My Teal"?');

    await userEvent.click(screen.getByRole("button", { name: "Overwrite" }));

    await waitFor(() => {
      expect(mockPresetsUpdate).toHaveBeenCalledWith(
        "uuid-custom-1",
        expect.objectContaining({ palette: expect.any(Object) }),
      );
    });
    expect(mockPresetsCreate).toHaveBeenCalledTimes(1); // no second create
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Template overwritten" }),
    );
    // The name field is cleared after a successful overwrite.
    expect(screen.getByLabelText("Name for the new template")).toHaveValue("");
  });

  it("keeps the existing template untouched when overwrite is declined", async () => {
    presetRows = [presetRow({})];
    mockPresetsCreate.mockResolvedValue({
      success: false,
      code: "DUPLICATE_NAME",
      existingId: "uuid-custom-1",
    });

    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    await userEvent.type(screen.getByLabelText("Name for the new template"), "My Teal");
    await userEvent.click(screen.getByRole("button", { name: /save as template/i }));

    await screen.findByRole("alertdialog");
    await userEvent.click(screen.getByRole("button", { name: /don't overwrite/i }));

    expect(mockPresetsUpdate).not.toHaveBeenCalled();
    // Nothing was created and the name stays in the field for editing.
    expect(mockPresetsCreate).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Name for the new template")).toHaveValue("My Teal");
  });

  it("imports a JSON file: confirms when it overwrites, then creates + overwrites", async () => {
    presetRows = [presetRow({})]; // "My Teal" already saved

    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    const filePresets = [
      { name: "Fresh Teal", description: "from file", theme: { ...mockThemeDataPalette(), lightPrimary: "10 50% 40%" } },
      { name: "My Teal", description: "file version", theme: { ...mockThemeDataPalette(), lightPrimary: "200 50% 40%" } },
    ];
    const file = new File([JSON.stringify(filePresets)], "templates.json", { type: "application/json" });
    await userEvent.upload(screen.getByTestId("import-templates-input"), file);

    // Collision → confirmation dialog first.
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain('Import 2 templates?');
    expect(dialog.textContent).toContain("overwrite 1 existing template");

    await userEvent.click(within(dialog).getByRole("button", { name: "Import" }));

    await waitFor(() => {
      expect(mockPresetsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Fresh Teal" }),
      );
    });
    await waitFor(() => {
      expect(mockPresetsUpdate).toHaveBeenCalledWith(
        "uuid-custom-1",
        expect.objectContaining({ description: "file version" }),
      );
    });
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Import complete", description: "1 imported · 1 overwritten" }),
      );
    });
  });

  it("imports a JSON file with no collisions straight away", async () => {
    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    const file = new File(
      [JSON.stringify([{ name: "Fresh Teal", description: "", theme: mockThemeDataPalette() }])],
      "templates.json",
      { type: "application/json" },
    );
    await userEvent.upload(screen.getByTestId("import-templates-input"), file);

    await waitFor(() => {
      expect(mockPresetsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Fresh Teal" }),
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Import complete", description: "1 imported" }),
    );
  });

  it("rejects an invalid JSON file with a destructive toast and no API calls", async () => {
    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    const file = new File(["not json at all"], "bad.json", { type: "application/json" });
    await userEvent.upload(screen.getByTestId("import-templates-input"), file);

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Import failed" }),
      );
    });
    expect(mockPresetsCreate).not.toHaveBeenCalled();
    expect(mockPresetsUpdate).not.toHaveBeenCalled();
  });

  it("saves the current palette as a one-click preset with an auto-generated name", async () => {
    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    await userEvent.click(screen.getByRole("button", { name: /save as preset/i }));

    await waitFor(() => {
      expect(mockPresetsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Preset 1", palette: expect.any(Object) }),
      );
    });
    // The refetch picks the new preset up and renders it in the grid.
    expect((await screen.findAllByText("Preset 1")).length).toBeGreaterThan(0);
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Preset saved" }),
    );
  });

  it("auto-names presets past existing collisions (Preset 1, Preset 2, …)", async () => {
    presetRows = [presetRow({ name: "Preset 1" })];

    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    await userEvent.click(screen.getByRole("button", { name: /save as preset/i }));

    await waitFor(() => {
      expect(mockPresetsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Preset 2" }),
      );
    });
  });

  it("blocks one-click preset saves when the 10-template cap is reached", async () => {
    presetRows = Array.from({ length: 10 }, (_, i) => presetRow({ id: `uuid-${i}`, name: `Existing ${i}` }));

    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    await userEvent.click(screen.getByRole("button", { name: /save as preset/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Template limit reached" }),
      );
    });
    expect(mockPresetsCreate).not.toHaveBeenCalled();
  });

  it("applies a saved custom template and then deletes it via the API", async () => {
    presetRows = [presetRow({})];

    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    // Saved template is rendered and can be applied.
    await userEvent.click(screen.getByRole("button", { name: "Apply My Teal template" }));
    await screen.findByDisplayValue("175 84% 38%");
    expect(screen.getByText(/currently using/i).textContent).toContain("My Teal");

    // And deleted again — the API delete + refetch remove it from the grid.
    await userEvent.click(screen.getByRole("button", { name: "Delete My Teal template" }));
    await waitFor(() => {
      expect(mockPresetsDelete).toHaveBeenCalledWith("uuid-custom-1");
    });
    await waitFor(() => {
      expect(screen.queryByText("My Teal")).not.toBeInTheDocument();
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Template deleted" }),
    );
  });

  it("applying a preset pre-fills the color fields (still fully editable)", async () => {
    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    await userEvent.click(screen.getByRole("button", { name: "Apply Ocean Blue template" }));

    // Ocean Blue light primary → the form now shows the preset value.
    expect(await screen.findByDisplayValue("217 91% 55%")).toBeInTheDocument();
    // Active state switches to the template.
    expect(screen.getByText(/currently using/i).textContent).toContain("Ocean Blue");

    // Manual control is untouched: the primary color picker/input still accepts edits.
    const primaryInput = screen.getByDisplayValue("217 91% 55%");
    await userEvent.clear(primaryInput);
    await userEvent.type(primaryInput, "0 0% 0%");
    expect(screen.getByDisplayValue("0 0% 0%")).toBeInTheDocument();
  });
});
