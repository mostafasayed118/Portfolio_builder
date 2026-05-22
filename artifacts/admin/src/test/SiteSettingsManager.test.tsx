import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SiteSettingsManager from "@/pages/SiteSettingsManager";

const { mockSettingsGet, mockSettingsUpdate, mockSettingsUpdateLanguage, mockToastSuccess } = vi.hoisted(
  () => ({
    mockSettingsGet: vi.fn(),
    mockSettingsUpdate: vi.fn(),
    mockSettingsUpdateLanguage: vi.fn(),
    mockToastSuccess: vi.fn(),
  }),
);

vi.mock("@/lib/api-client", () => ({
  api: {
    siteSettings: {
      get: mockSettingsGet,
      update: mockSettingsUpdate,
      updateLanguage: mockSettingsUpdateLanguage,
    },
  },
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(() => ({
    from: () => ({
      select: () => ({ not: () => ({ maybeSingle: () => ({ data: null }) }) }),
    }),
  })),
  isSupabaseConfigured: true,
}));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return {
    ...actual,
    useToast: () => ({ toast: mockToastSuccess }),
  };
});

vi.mock("@workspace/auth", () => ({
  useAuthUser: () => ({ isSuperadmin: false }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const mockSiteData = {
  site_name: "My Portfolio",
  site_tagline: "Developer",
  footer_text: "Footer text",
  copyright_text: "2024",
  logo_text: "MP",
  default_theme: "dark",
  language_mode: "en_only",
  default_language: "en",
  show_language_toggle: false,
  rtl_enabled: false,
};

describe("SiteSettingsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsGet.mockResolvedValue({ success: true, data: mockSiteData });
    mockSettingsUpdate.mockResolvedValue({ success: true });
    mockSettingsUpdateLanguage.mockResolvedValue({ success: true });
  });

  it("renders form fields correctly", async () => {
    renderWithProviders(<SiteSettingsManager />);

    expect(await screen.findByText("Site Settings")).toBeInTheDocument();
    expect(screen.getByText("Identity")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
    expect(screen.getByText("Defaults")).toBeInTheDocument();
  });

  it("pre-fills form from fetched data", async () => {
    renderWithProviders(<SiteSettingsManager />);

    await expect(screen.findByDisplayValue("My Portfolio")).resolves.toBeInTheDocument();
    expect(screen.getByDisplayValue("Developer")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Footer text")).toBeInTheDocument();
  });

  it("calls update on save", async () => {
    renderWithProviders(<SiteSettingsManager />);

    await screen.findByDisplayValue("My Portfolio");

    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockSettingsUpdate).toHaveBeenCalled();
    });
  });

  it("language toggle works", async () => {
    renderWithProviders(<SiteSettingsManager />);

    await screen.findByText("Site Settings");

    expect(screen.getByText("Language & Localization")).toBeInTheDocument();
    expect(screen.getByText(/English Only/)).toBeInTheDocument();
    expect(screen.getByText(/Arabic Only/)).toBeInTheDocument();
    expect(screen.getByText(/Both Languages/)).toBeInTheDocument();
  });
});
