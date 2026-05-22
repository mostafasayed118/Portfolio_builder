import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TypographyManager from "@/pages/TypographyManager";

const { mockTypoGet, mockTypoUpdate, mockToastSuccess } = vi.hoisted(
  () => ({
    mockTypoGet: vi.fn(),
    mockTypoUpdate: vi.fn(),
    mockToastSuccess: vi.fn(),
  }),
);

vi.mock("@/lib/api-client", () => ({
  api: {
    typographySettings: {
      get: mockTypoGet,
      update: mockTypoUpdate,
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

const mockTypoData = {
  body_font: "Inter",
  display_font: "Playfair Display",
  body_font_url: "https://fonts.googleapis.com/css2?family=Inter",
  display_font_url: "https://fonts.googleapis.com/css2?family=Playfair+Display",
  base_font_size: "16px",
  line_height: "1.6",
  letter_spacing: "0em",
  heading_scale: "1.25",
  font_weight_body: "400",
  font_weight_heading: "700",
};

describe("TypographyManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTypoGet.mockResolvedValue({ success: true, data: mockTypoData });
    mockTypoUpdate.mockResolvedValue({ success: true });
  });

  it("renders form fields correctly", async () => {
    renderWithProviders(<TypographyManager />);

    expect(await screen.findByText("Typography Manager")).toBeInTheDocument();
    expect(screen.getByText("Font Pairs")).toBeInTheDocument();
    expect(screen.getByText("Custom Fonts")).toBeInTheDocument();
    expect(screen.getByText("Scale & Rhythm")).toBeInTheDocument();
  });

  it("pre-fills fonts from fetched typography data", async () => {
    renderWithProviders(<TypographyManager />);

    await expect(screen.findByDisplayValue("Inter")).resolves.toBeInTheDocument();
    expect(screen.getByDisplayValue("Playfair Display")).toBeInTheDocument();
    expect(screen.getByText("16px")).toBeInTheDocument();
  });

  it("calls update on save", async () => {
    renderWithProviders(<TypographyManager />);

    await screen.findByDisplayValue("Inter");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockTypoUpdate).toHaveBeenCalled();
    });
  });

  it("shows success toast after save", async () => {
    renderWithProviders(<TypographyManager />);

    await screen.findByDisplayValue("Inter");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Typography saved" }),
      );
    });
  });
});
