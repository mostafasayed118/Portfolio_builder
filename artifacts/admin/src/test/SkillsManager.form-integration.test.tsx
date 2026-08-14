import { vi, describe, it, expect, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SkillsManager } from "@/features/skills";

const { mockSkillsList, mockSkillsCreate, mockSkillsUpdate, mockToast } = vi.hoisted(() => ({
  mockSkillsList: vi.fn(),
  mockSkillsCreate: vi.fn(),
  mockSkillsUpdate: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: { skills: { list: mockSkillsList, create: mockSkillsCreate, update: mockSkillsUpdate, delete: vi.fn() } },
}));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return { ...actual, useToast: () => ({ toast: mockToast }) };
});

vi.mock("@/lib/supabase", () => ({ getSupabase: vi.fn(() => ({})), isSupabaseConfigured: true }));

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
      <p>No skills added</p>
      <button onClick={onAction}>Add Skill</button>
    </div>
  ),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { ...render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>) };
}

const mockSkills = [
  { id: "1", name: "Python", category: "languages", proficiency: 95, is_visible: true, sort_order: 1 },
  { id: "2", name: "SQL", category: "languages", proficiency: 85, is_visible: true, sort_order: 2 },
];

describe("SkillsManager form integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSkillsList.mockResolvedValue({ success: true, data: mockSkills });
    mockSkillsCreate.mockResolvedValue({ success: true });
    mockSkillsUpdate.mockResolvedValue({ success: true });
  });

  it("creates a new skill via dialog", async () => {
    renderWithProviders(<SkillsManager />);

    await screen.findByText("Python");

    await userEvent.click(screen.getByRole("button", { name: /add skill/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Fill in name using first textbox in the dialog
    const nameInput = screen.getAllByRole("textbox")[0];
    if (nameInput) {
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "TypeScript");
    }

    // Save
    await userEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockSkillsCreate).toHaveBeenCalled();
    });
  });

  it("shows error toast on duplicate name", async () => {
    renderWithProviders(<SkillsManager />);

    await screen.findByText("Python");

    await userEvent.click(screen.getByRole("button", { name: /add skill/i }));
    await screen.findByRole("dialog");

    const nameInput = screen.getAllByRole("textbox")[0];
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Python");

    await userEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Duplicate name", variant: "destructive" }),
      );
    });
  });

  it("shows loading state while saving", async () => {
    let resolve: (v: unknown) => void;
    mockSkillsCreate.mockImplementation(() => new Promise(r => { resolve = r; }));

    renderWithProviders(<SkillsManager />);
    await screen.findByText("Python");

    await userEvent.click(screen.getByRole("button", { name: /add skill/i }));
    await screen.findByRole("dialog");

    const nameInput = screen.getAllByRole("textbox")[0];
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Java");

    await userEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Saving…")).toBeInTheDocument();
    });

    await act(async () => {
      resolve({ success: true });
    });
  });

  it("validates empty name on save", async () => {
    renderWithProviders(<SkillsManager />);
    await screen.findByText("Python");

    await userEvent.click(screen.getByRole("button", { name: /add skill/i }));
    await screen.findByRole("dialog");

    // Click Save without entering name
    await userEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Name is required", variant: "destructive" }),
      );
    });
  });

  it("shows skills grouped by category", async () => {
    renderWithProviders(<SkillsManager />);
    await screen.findByText("Python");
    expect(screen.getByText("SQL")).toBeInTheDocument();
    expect(screen.getByText("languages")).toBeInTheDocument();
  });
});
