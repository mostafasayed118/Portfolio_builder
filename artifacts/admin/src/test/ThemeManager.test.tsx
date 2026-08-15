import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeManager } from "@/features/settings";

const { mockThemeGet, mockThemeUpdate, mockToastSuccess } = vi.hoisted(
  () => ({
    mockThemeGet: vi.fn(),
    mockThemeUpdate: vi.fn(),
    mockToastSuccess: vi.fn(),
  }),
);

vi.mock("@/lib/api-client", () => ({
  api: {
    themeSettings: {
      get: mockThemeGet,
      update: mockThemeUpdate,
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
    mockThemeGet.mockResolvedValue({ success: true, data: mockThemeData });
    mockThemeUpdate.mockResolvedValue({ success: true });
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
      expect.objectContaining({ title: "Random palette generated" }),
    );
    // Mode and radius survive the roll: the radius text is still the saved one.
    expect(screen.getByText("0.5rem")).toBeInTheDocument();
  });

  it("saves the current palette as a named custom template", async () => {
    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    await userEvent.type(screen.getByLabelText("Name for the new template"), "My Teal");
    await userEvent.click(screen.getByRole("button", { name: /save as template/i }));

    // Appears in the template grid (and as the active "Currently using" name).
    expect((await screen.findAllByText("My Teal")).length).toBeGreaterThan(0);
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(localStorage.getItem("pf-theme-custom-presets-v1")).toContain("My Teal");
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Template saved" }),
    );
  });

  it("applies a saved custom template and then deletes it", async () => {
    localStorage.setItem("pf-theme-custom-presets-v1", JSON.stringify([{
      id: "custom-1",
      name: "My Teal",
      description: "Custom palette saved on Aug 15, 2026",
      theme: {
        mode: "dark",
        lightPrimary: "175 84% 38%", lightAccent: "189 90% 38%", lightBackground: "220 30% 97%",
        lightForeground: "222 40% 10%", lightCard: "0 0% 100%", lightBorder: "220 18% 84%",
        lightMuted: "220 20% 91%", lightMutedForeground: "220 15% 42%", lightRing: "175 84% 42%",
        darkPrimary: "175 84% 62%", darkAccent: "189 95% 53%", darkBackground: "222 48% 6%",
        darkForeground: "210 30% 96%", darkCard: "222 40% 9%", darkBorder: "220 22% 18%",
        darkMuted: "222 32% 12%", darkMutedForeground: "215 18% 72%", darkRing: "175 84% 62%",
        radius: "0.5rem",
      },
    }]));

    renderWithProviders(<ThemeManager />);

    await screen.findByDisplayValue("204 92% 42%");

    // Saved template is rendered and can be applied.
    await userEvent.click(screen.getByRole("button", { name: "Apply My Teal template" }));
    await screen.findByDisplayValue("175 84% 38%");
    expect(screen.getByText(/currently using/i).textContent).toContain("My Teal");

    // And deleted again.
    await userEvent.click(screen.getByRole("button", { name: "Delete My Teal template" }));
    expect(screen.queryByText("My Teal")).not.toBeInTheDocument();
    expect(localStorage.getItem("pf-theme-custom-presets-v1")).not.toContain("My Teal");
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
