import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SectionOrderManager from "@/pages/SectionOrderManager";

const { mockSectionList, mockSectionUpdate, mockSectionReorder, mockToastSuccess } = vi.hoisted(
  () => ({
    mockSectionList: vi.fn(),
    mockSectionUpdate: vi.fn(),
    mockSectionReorder: vi.fn(),
    mockToastSuccess: vi.fn(),
  }),
);

vi.mock("@/lib/api-client", () => ({
  api: {
    sectionSettings: {
      list: mockSectionList,
      update: mockSectionUpdate,
      reorder: mockSectionReorder,
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

const mockSections = [
  { id: "1", key: "hero", label: "Hero Section", is_visible: true, sort_order: 1 },
  { id: "2", key: "about", label: "About Section", is_visible: true, sort_order: 2 },
  { id: "3", key: "projects", label: "Projects Section", is_visible: false, sort_order: 3 },
];

describe("SectionOrderManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSectionList.mockResolvedValue({ success: true, data: mockSections });
    mockSectionReorder.mockResolvedValue({ success: true });
    mockSectionUpdate.mockResolvedValue({ success: true });
  });

  it("renders section list", async () => {
    renderWithProviders(<SectionOrderManager />);

    await expect(screen.findByText("Hero Section")).resolves.toBeInTheDocument();
    expect(screen.getByText("About Section")).toBeInTheDocument();
    expect(screen.getByText("Projects Section")).toBeInTheDocument();
  });

  it("toggles section visibility", async () => {
    renderWithProviders(<SectionOrderManager />);

    await screen.findByText("Hero Section");

    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThan(0);

    await userEvent.click(switches[0]);

    expect(switches[0]).not.toBeChecked();
  });

  it("calls reorder on save", async () => {
    renderWithProviders(<SectionOrderManager />);

    await screen.findByText("Hero Section");

    await userEvent.click(screen.getByRole("button", { name: /save order/i }));

    await waitFor(() => {
      expect(mockSectionReorder).toHaveBeenCalled();
    });
  });

  it("shows success toast after save", async () => {
    renderWithProviders(<SectionOrderManager />);

    await screen.findByText("Hero Section");

    await userEvent.click(screen.getByRole("button", { name: /save order/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Section order saved" }),
      );
    });
  });
});
