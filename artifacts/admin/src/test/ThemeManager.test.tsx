import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemeManager from "@/pages/ThemeManager";

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
});
