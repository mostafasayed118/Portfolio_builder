import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SkillsManager from "@/pages/SkillsManager";

const { mockListSkills, mockCreateSkill, mockUpdateSkill, mockDeleteSkill } =
  vi.hoisted(() => ({
    mockListSkills: vi.fn(),
    mockCreateSkill: vi.fn(),
    mockUpdateSkill: vi.fn(),
    mockDeleteSkill: vi.fn(),
  }));

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(() => ({})),
  isSupabaseConfigured: true,
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    skills: {
      list: mockListSkills,
      create: mockCreateSkill,
      update: mockUpdateSkill,
      delete: mockDeleteSkill,
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

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const mockSkills = [
  {
    id: "1",
    name: "Python",
    category: "Languages",
    proficiency: 90,
    is_visible: true,
    sort_order: 1,
  },
  {
    id: "2",
    name: "SQL",
    category: "Languages",
    proficiency: 85,
    is_visible: true,
    sort_order: 2,
  },
  {
    id: "3",
    name: "Apache Spark",
    category: "Frameworks",
    proficiency: 80,
    is_visible: true,
    sort_order: 1,
  },
];

describe("SkillsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSkills.mockResolvedValue({ success: true, data: mockSkills });
    mockCreateSkill.mockResolvedValue({ success: true });
    mockDeleteSkill.mockResolvedValue({ success: true });
  });

  it("renders skills grouped by category", async () => {
    renderWithProviders(<SkillsManager />);

    expect(await screen.findByText("Skills Manager")).toBeInTheDocument();
    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.getByText("Frameworks")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("SQL")).toBeInTheDocument();
    expect(screen.getByText("Apache Spark")).toBeInTheDocument();
    expect(screen.getByText("3 skills across 2 categories.")).toBeInTheDocument();
  });

  it("calls createSkill on form submit", async () => {
    renderWithProviders(<SkillsManager />);

    await screen.findByText("Skills Manager");
    await userEvent.click(screen.getByRole("button", { name: /add skill/i }));
    const dialog = await screen.findByRole("dialog");
    const nameInput = within(dialog).getAllByRole("textbox")[0];
    const categoryInput = within(dialog).getAllByRole("textbox")[1];

    await userEvent.type(nameInput, "Rust");
    await userEvent.type(categoryInput, "Languages");

    await userEvent.click(within(dialog).getByText("Save"));

    await waitFor(() => {
      expect(mockCreateSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Rust",
          category: "Languages",
        }),
      );
    });
  });

  it("confirms before deleting skill", async () => {
    renderWithProviders(<SkillsManager />);

    await screen.findByText("Skills Manager");

    const deleteBtns = screen.getAllByRole("button", { name: /delete skill/i });
    await userEvent.click(deleteBtns[0]);

    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByText("Delete"));

    await waitFor(() => {
      expect(mockDeleteSkill).toHaveBeenCalledWith("1");
    });
  });
});
