import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExperienceManager } from "@/features/experience";

const { mockExperienceList, mockExperienceCreate, mockToast } = vi.hoisted(() => ({
  mockExperienceList: vi.fn(),
  mockExperienceCreate: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: { experience: { list: mockExperienceList, create: mockExperienceCreate, update: vi.fn(), delete: vi.fn() } },
}));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return { ...actual, useToast: () => ({ toast: mockToast }) };
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
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { ...render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>) };
}

const mockExperience = [
  { id: "1", title: "Data Engineer", company: "Microsoft", location: "Cairo", period: "2024 – Present", description: ["Built pipelines"], technologies: ["Python", "SQL"], type: "internship", sort_order: 1, is_published: true },
];

describe("ExperienceManager form integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExperienceList.mockResolvedValue({ success: true, data: mockExperience });
    mockExperienceCreate.mockResolvedValue({ success: true });
  });

  it("renders experience list", async () => {
    renderWithProviders(<ExperienceManager />);

    await screen.findByText("Data Engineer");
    expect(screen.getByText("@ Microsoft")).toBeInTheDocument();
  });

  it("opens add experience dialog", async () => {
    renderWithProviders(<ExperienceManager />);
    await screen.findByText("Data Engineer");

    // Button text is "Add Entry" (not "Add experience")
    await userEvent.click(screen.getByRole("button", { name: /add entry/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Add Experience")).toBeInTheDocument();
  });

  it("validates required title on save", async () => {
    renderWithProviders(<ExperienceManager />);
    await screen.findByText("Data Engineer");

    await userEvent.click(screen.getByRole("button", { name: /add entry/i }));
    await screen.findByRole("dialog");

    // Click save without filling in title
    await userEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Title is required", variant: "destructive" }),
      );
    });
  });

  it("adds description lines in dialog", async () => {
    renderWithProviders(<ExperienceManager />);
    await screen.findByText("Data Engineer");

    await userEvent.click(screen.getByRole("button", { name: /add entry/i }));
    await screen.findByRole("dialog");

    // Should have 1 description line initially
    const textareas = screen.getAllByRole("textbox");
    const initialCount = textareas.length;

    // Add description line — button text is "Add" with aria-label "Add description bullet"
    await userEvent.click(screen.getByLabelText("Add description bullet"));

    await waitFor(() => {
      const textareasAfter = screen.getAllByRole("textbox");
      expect(textareasAfter.length).toBeGreaterThan(initialCount);
    });
  });
});
