import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SeoManager from "@/pages/SeoManager";

const { mockSeoGet, mockSeoUpdate, mockToastSuccess } = vi.hoisted(
  () => ({
    mockSeoGet: vi.fn(),
    mockSeoUpdate: vi.fn(),
    mockToastSuccess: vi.fn(),
  }),
);

vi.mock("@/lib/api-client", () => ({
  api: {
    seoSettings: {
      get: mockSeoGet,
      update: mockSeoUpdate,
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

const mockSeoData = {
  title: "My Portfolio",
  description: "A portfolio site",
  keywords: "developer, portfolio",
  og_title: "My Portfolio OG",
  og_description: "OG desc",
  og_image: "https://example.com/og.png",
  canonical_url: "https://example.com",
  twitter_card: "summary_large_image",
  twitter_creator: "@test",
};

describe("SeoManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSeoGet.mockResolvedValue({ success: true, data: mockSeoData });
    mockSeoUpdate.mockResolvedValue({ success: true });
  });

  it("renders form fields correctly", async () => {
    renderWithProviders(<SeoManager />);

    expect(await screen.findByText("SEO Settings")).toBeInTheDocument();
    expect(screen.getByText("Core Meta Tags")).toBeInTheDocument();
    expect(screen.getByText("Open Graph (Social)")).toBeInTheDocument();
  });

  it("pre-fills title and description from fetched data", async () => {
    renderWithProviders(<SeoManager />);

    await expect(screen.findByDisplayValue("My Portfolio")).resolves.toBeInTheDocument();
    expect(screen.getByDisplayValue("A portfolio site")).toBeInTheDocument();
    expect(screen.getByDisplayValue("developer, portfolio")).toBeInTheDocument();
  });

  it("calls update on save", async () => {
    renderWithProviders(<SeoManager />);

    await screen.findByDisplayValue("My Portfolio");

    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockSeoUpdate).toHaveBeenCalled();
    });
  });

  it("validates required field limits", async () => {
    renderWithProviders(<SeoManager />);

    await screen.findByDisplayValue("My Portfolio");

    const titleInput = screen.getByDisplayValue("My Portfolio");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "A".repeat(70));

    const saveBtn = screen.getByRole("button", { name: /^save$/i });
    expect(saveBtn).toBeDisabled();
  });
});
