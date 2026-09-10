import { vi, describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderWithProviders,
  smartConfirmDialogMock,
  smartEmptyStateMock,
  stubUseToast,
} from "./helpers";
import { ProjectsManager } from "@/features/projects";

const { mockProjectsList, mockProjectsCreate, mockToast } = vi.hoisted(() => ({
  mockProjectsList: vi.fn(),
  mockProjectsCreate: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: { projects: { list: mockProjectsList, create: mockProjectsCreate, update: vi.fn(), delete: vi.fn() } },
}));

vi.mock("@workspace/ui", (importOriginal) => stubUseToast(importOriginal, mockToast));

vi.mock("@/lib/supabase", () => ({ getSupabase: vi.fn(() => ({})), isSupabaseConfigured: true }));

vi.mock("@/components/SmartConfirmDialog", () => smartConfirmDialogMock());

vi.mock("@/components/SmartEmptyState", () => smartEmptyStateMock("No projects found", "Add Project"));

const mockProjects = [
  { id: "1", title: "Data Pipeline", description: "ETL pipeline", tech_stack: ["Python", "SQL"], category: "data-engineering", featured: true, github_url: "https://github.com/test", live_url: "", metrics: [], sort_order: 1, is_published: true, slug: "data-pipeline" },
];

describe("ProjectsManager form integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectsList.mockResolvedValue({ success: true, data: mockProjects });
    mockProjectsCreate.mockResolvedValue({ success: true });
  });

  it("renders project list", async () => {
    renderWithProviders(<ProjectsManager />);
    await screen.findByText("Data Pipeline");
    // The mock returns 1 project. Count is rendered across React fragments so use a regex.
    expect(screen.getByText(/1\s+project/)).toBeInTheDocument();
  });

  it("search filters projects", async () => {
    renderWithProviders(<ProjectsManager />);
    await screen.findByText("Data Pipeline");

    const searchInput = screen.getByPlaceholderText("Search projects...");
    await userEvent.type(searchInput, "ETL");

    expect(screen.getByText("Data Pipeline")).toBeInTheDocument();

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, "nonexistent");

    await waitFor(() => {
      expect(screen.queryByText("Data Pipeline")).not.toBeInTheDocument();
    });
  });

  it("opens add project dialog", async () => {
    renderWithProviders(<ProjectsManager />);
    await screen.findByText("Data Pipeline");

    // Use getAllByRole to find the button specifically (not the dialog title)
    const addButtons = screen.getAllByRole("button", { name: /add project/i });
    await userEvent.click(addButtons[0]); // Click the first one (the button, not the dialog title)

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // Dialog title shows "Add Project" — there are now 2 elements with this text
    expect(screen.getAllByText("Add Project").length).toBeGreaterThanOrEqual(2);
  });

  it("validates required fields on save", async () => {
    renderWithProviders(<ProjectsManager />);
    await screen.findByText("Data Pipeline");

    const addButtons = screen.getAllByRole("button", { name: /add project/i });
    await userEvent.click(addButtons[0]);
    await screen.findByRole("dialog");

    // Click save without filling in fields
    await userEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Title is required", variant: "destructive" }),
      );
    });
  });
});
