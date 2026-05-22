import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ExperienceManager from "@/pages/ExperienceManager";

const { mockList, mockCreate, mockUpdate, mockDelete, mockToastSuccess, mockToastError } = vi.hoisted(
  () => ({
    mockList: vi.fn(),
    mockCreate: vi.fn(),
    mockUpdate: vi.fn(),
    mockDelete: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
  }),
);

vi.mock("@/lib/api-client", () => ({
  api: {
    experience: {
      list: mockList,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
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

vi.mock("@/components/SmartConfirmDialog", () => ({
  SmartConfirmDialog: ({ state, onCancel }: any) =>
    state.isOpen ? (
      <div data-testid="confirm-dialog">
        <p>{state.title}</p>
        <button onClick={state.onConfirm}>{state.confirmLabel}</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock("@/components/SmartEmptyState", () => ({
  SmartEmptyState: ({ onAction }: any) => (
    <div data-testid="empty-state">
      <p>No experience entries</p>
      <button onClick={onAction}>Add Entry</button>
    </div>
  ),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const mockExpItems = [
  {
    id: "1",
    title: "Data Engineer",
    company: "TechCorp",
    location: "Cairo",
    period: "2023-2024",
    description: ["Built pipelines"],
    technologies: ["Python"],
    type: "internship",
    sort_order: 1,
    is_published: true,
  },
];

describe("ExperienceManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ success: true, data: mockExpItems });
    mockCreate.mockResolvedValue({ success: true });
    mockDelete.mockResolvedValue({ success: true });
  });

  it("renders experience list", async () => {
    renderWithProviders(<ExperienceManager />);

    await expect(screen.findByText("Data Engineer")).resolves.toBeInTheDocument();
    expect(screen.getByText("@ TechCorp")).toBeInTheDocument();
  });

  it("shows empty state when no items", async () => {
    mockList.mockResolvedValue({ success: true, data: [] });

    renderWithProviders(<ExperienceManager />);

    await expect(screen.findByTestId("empty-state")).resolves.toBeInTheDocument();
  });

  it("opens create dialog on Add Entry click", async () => {
    renderWithProviders(<ExperienceManager />);

    await screen.findByText("Data Engineer");

    await userEvent.click(screen.getByRole("button", { name: /add entry/i }));
    expect(screen.getByText("Add Experience")).toBeInTheDocument();
  });

  it("creates entry on submit", async () => {
    mockCreate.mockResolvedValue({ success: true });

    renderWithProviders(<ExperienceManager />);

    await screen.findByText("Data Engineer");

    await userEvent.click(screen.getByRole("button", { name: /add entry/i }));

    const titleInput = screen.getByLabelText(/title/i);
    await userEvent.type(titleInput, "New Role");

    const companyInput = screen.getByLabelText(/company/i);
    await userEvent.type(companyInput, "NewCorp");

    const periodInput = screen.getByLabelText(/period/i);
    await userEvent.type(periodInput, "2024-2025");

    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  it("deletes entry with confirmation", async () => {
    mockDelete.mockResolvedValue({ success: true });

    renderWithProviders(<ExperienceManager />);

    await screen.findByText("Data Engineer");

    await userEvent.click(screen.getByRole("button", { name: /delete experience/i }));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("1");
    });
  });
});
