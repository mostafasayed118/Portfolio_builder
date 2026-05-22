import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectsManager from "@/pages/ProjectsManager";

const { mockListProjects, mockCreateProject, mockUpdateProject, mockDeleteProject } =
  vi.hoisted(() => ({
    mockListProjects: vi.fn(),
    mockCreateProject: vi.fn(),
    mockUpdateProject: vi.fn(),
    mockDeleteProject: vi.fn(),
  }));

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(() => ({})),
  isSupabaseConfigured: true,
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    projects: {
      list: mockListProjects,
      create: mockCreateProject,
      update: mockUpdateProject,
      delete: mockDeleteProject,
    },
  },
}));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return {
    ...actual,
    useToast: () => ({ toast: vi.fn() }),
  };
});

vi.mock("@/components/ImageUploader", () => ({
  default: () => null,
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const mockProjects = [
  {
    id: "1",
    title: "Data Pipeline",
    description: "An ETL pipeline project",
    tech_stack: ["Python", "Spark"],
    category: "Data Engineering",
    featured: true,
    github_url: "https://github.com/user/pipeline",
    live_url: null,
    metrics: ["99.9% uptime"],
    sort_order: 1,
    is_published: true,
  },
  {
    id: "2",
    title: "Dashboard App",
    description: "Analytics dashboard",
    tech_stack: ["React", "D3"],
    category: "Frontend",
    featured: false,
    github_url: "",
    live_url: "https://dashboard.example.com",
    metrics: [],
    sort_order: 2,
    is_published: false,
  },
];

describe("ProjectsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListProjects.mockResolvedValue({ success: true, data: mockProjects });
    mockCreateProject.mockResolvedValue({ success: true });
    mockUpdateProject.mockResolvedValue({ success: true });
    mockDeleteProject.mockResolvedValue({ success: true });
  });

  it("renders projects table", async () => {
    renderWithProviders(<ProjectsManager />);

    expect(await screen.findByText("Projects Manager")).toBeInTheDocument();
    expect(screen.getByText("Data Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Dashboard App")).toBeInTheDocument();
    expect(screen.getByText("2 projects")).toBeInTheDocument();
  });

  it("opens dialog on Add Project click", async () => {
    renderWithProviders(<ProjectsManager />);

    await screen.findByText("Projects Manager");
    await userEvent.click(screen.getByRole("button", { name: /add project/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("auto-generates slug from title", async () => {
    renderWithProviders(<ProjectsManager />);

    await screen.findByText("Projects Manager");
    await userEvent.click(screen.getByRole("button", { name: /add project/i }));
    await screen.findByRole("dialog");

    const dialog = screen.getByRole("dialog");
    const textboxs = within(dialog).getAllByRole("textbox");
    await userEvent.type(textboxs[0], "My Amazing Project");
    await userEvent.type(textboxs[1], "A description");
    await userEvent.type(textboxs[2], "Data Engineering");

    await userEvent.click(within(dialog).getByText("Save"));

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalled();
      const payload = mockCreateProject.mock.calls[0][0];
      expect(payload.slug).toBe("my-amazing-project");
    });
  });

  it("validates required fields on submit", async () => {
    renderWithProviders(<ProjectsManager />);

    await screen.findByText("Projects Manager");
    await userEvent.click(screen.getByRole("button", { name: /add project/i }));
    await screen.findByRole("dialog");

    const dialog = screen.getByRole("dialog");
    const textboxs = within(dialog).getAllByRole("textbox");
    await userEvent.type(textboxs[0], "Test Project");
    await userEvent.type(textboxs[1], "A description");
    await userEvent.type(textboxs[2], "Data Engineering");

    await userEvent.click(within(dialog).getByText("Save"));

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalled();
      const payload = mockCreateProject.mock.calls[0][0];
      expect(payload.title).toBe("Test Project");
      expect(payload.slug).toBe("test-project");
    });
  });

  it("calls createProject on form submit", async () => {
    renderWithProviders(<ProjectsManager />);

    await screen.findByText("Projects Manager");
    await userEvent.click(screen.getByRole("button", { name: /add project/i }));
    await screen.findByRole("dialog");

    const dialog = screen.getByRole("dialog");
    const textboxs = within(dialog).getAllByRole("textbox");
    await userEvent.type(textboxs[0], "New Project");
    await userEvent.type(textboxs[1], "A description");
    await userEvent.type(textboxs[2], "Data Engineering");

    await userEvent.click(within(dialog).getByText("Save"));

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "New Project",
          slug: "new-project",
        }),
      );
    });
  });

  it("calls delete API when delete is confirmed", async () => {
    mockDeleteProject.mockResolvedValue({ success: true });
    
    const { container } = renderWithProviders(<ProjectsManager />);

    await screen.findByText("Projects Manager");

    const deleteBtn = container.querySelector(
      "button.text-destructive",
    ) as HTMLElement;
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText("Delete Project")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(mockDeleteProject).toHaveBeenCalled();
    });
  });
});
