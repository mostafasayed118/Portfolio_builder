import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SearchPalette from "@/components/SearchPalette";

const mockSetLocation = vi.fn();
vi.mock("wouter", () => ({
  useLocation: () => ["/", mockSetLocation],
}));

const { mockListPosts, mockListProjects, mockListSkills, mockListExperience, mockListCertifications } =
  vi.hoisted(() => ({
    mockListPosts: vi.fn(),
    mockListProjects: vi.fn(),
    mockListSkills: vi.fn(),
    mockListExperience: vi.fn(),
    mockListCertifications: vi.fn(),
  }));

vi.mock("@/lib/api-client", () => ({
  api: {
    posts: { list: mockListPosts },
    projects: { list: mockListProjects },
    skills: { list: mockListSkills },
    experience: { list: mockListExperience },
    certifications: { list: mockListCertifications },
  },
}));

// Mock @workspace/ui CommandDialog to render children in a portal-like div
vi.mock("@workspace/ui", () => {
  const React = require("react");
  return {
    CommandDialog: ({ open, onOpenChange, children }: any) =>
      open ? (
        <div role="dialog" aria-modal="true" data-testid="command-dialog">
          <button onClick={() => onOpenChange(false)} data-testid="close-btn">×</button>
          {children}
        </div>
      ) : null,
    CommandInput: ({ placeholder, ...props }: any) => (
      <input
        placeholder={placeholder}
        data-testid="command-input"
        {...props}
        onChange={(e) => {
          // cmdk's CommandInput surfaces typed text via onValueChange, not onChange.
          props.onChange?.(e);
          props.onValueChange?.(e.target.value);
        }}
      />
    ),
    CommandList: ({ children, ...props }: any) => <div data-testid="command-list" {...props}>{children}</div>,
    CommandEmpty: ({ children }: any) => <div data-testid="command-empty">{children}</div>,
    CommandGroup: ({ heading, children }: any) => (
      <div data-testid={`group-${heading?.toLowerCase()?.replace(/\s+/g, "-")}`}>
        <span>{heading}</span>
        {children}
      </div>
    ),
    CommandItem: ({ children, value, onSelect, ...props }: any) => (
      <div data-testid="command-item" data-value={value} onClick={onSelect} {...props}>
        {children}
      </div>
    ),
    CommandSeparator: () => <hr data-testid="separator" />,
  };
});

describe("SearchPalette — shell Ctrl/Cmd+K search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPosts.mockResolvedValue({ success: true, data: { data: [] } });
    mockListProjects.mockResolvedValue({ success: true, data: { data: [] } });
    mockListSkills.mockResolvedValue({ success: true, data: { data: [] } });
    mockListExperience.mockResolvedValue({ success: true, data: { data: [] } });
    mockListCertifications.mockResolvedValue({ success: true, data: { data: [] } });
  });

  it("is closed by default", () => {
    render(<SearchPalette />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens on Ctrl+K", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("opens on Cmd+K (Mac)", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("has a search input", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });
  });

  it("input has correct placeholder", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Type a command or search...")).toBeInTheDocument();
    });
  });

  it("shows all navigation groups", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Content")).toBeInTheDocument();
      expect(screen.getByText("Inbox")).toBeInTheDocument();
      expect(screen.getByText("Site")).toBeInTheDocument();
      expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    });
  });

  it("contains Overview in navigation items", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });
  });

  it("contains all content items", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      for (const item of ["Hero", "About", "Projects", "Skills", "Experience", "Certifications"]) {
        expect(screen.getByText(item)).toBeInTheDocument();
      }
    });
  });

  it("contains all site items", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      for (const item of ["CV / Resume", "SEO", "Typography", "Section Order", "Theme", "Site Settings"]) {
        expect(screen.getByText(item)).toBeInTheDocument();
      }
    });
  });

  it("contains Quick Actions", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      for (const item of ["View Live Portfolio", "Add New Project", "Add New Skill", "Add New Experience", "Add New Post", "Add New Certification", "Edit Latest Draft", "Generate Project Description", "Suggest Categories for Skill", "Suggest Tags for Project", "Analyze Content"]) {
        expect(screen.getByText(item)).toBeInTheDocument();
      }
    });
  });

  it("deep-links to an AI tool from its quick action", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText("Generate Project Description")).toBeInTheDocument();
    });
    const item = screen.getByText("Generate Project Description").closest("[data-testid='command-item']");
    fireEvent.click(item!);
    expect(mockSetLocation).toHaveBeenCalledWith("/ai#generate-description");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deep-links to the analyze-content tool from its quick action", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText("Analyze Content")).toBeInTheDocument();
    });
    const item = screen.getByText("Analyze Content").closest("[data-testid='command-item']");
    fireEvent.click(item!);
    expect(mockSetLocation).toHaveBeenCalledWith("/ai#analyze-content");
  });

  it("deep-links to the New Post editor from its quick action", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText("Add New Post")).toBeInTheDocument();
    });
    const item = screen.getByText("Add New Post").closest("[data-testid='command-item']");
    fireEvent.click(item!);
    expect(mockSetLocation).toHaveBeenCalledWith("/posts#new");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deep-links to the New Certification editor from its quick action", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText("Add New Certification")).toBeInTheDocument();
    });
    const item = screen.getByText("Add New Certification").closest("[data-testid='command-item']");
    fireEvent.click(item!);
    expect(mockSetLocation).toHaveBeenCalledWith("/certifications#new");
  });

  it("deep-links to the New Project editor from its quick action", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText("Add New Project")).toBeInTheDocument();
    });
    const item = screen.getByText("Add New Project").closest("[data-testid='command-item']");
    fireEvent.click(item!);
    expect(mockSetLocation).toHaveBeenCalledWith("/projects#new");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deep-links to the Add New Skill editor from its quick action", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText("Add New Skill")).toBeInTheDocument();
    });
    const item = screen.getByText("Add New Skill").closest("[data-testid='command-item']");
    fireEvent.click(item!);
    expect(mockSetLocation).toHaveBeenCalledWith("/skills#new");
  });

  it("deep-links to the Add New Experience editor from its quick action", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText("Add New Experience")).toBeInTheDocument();
    });
    const item = screen.getByText("Add New Experience").closest("[data-testid='command-item']");
    fireEvent.click(item!);
    expect(mockSetLocation).toHaveBeenCalledWith("/experience#new");
  });

  it("deep-links to the newest unpublished draft's editor from its quick action", async () => {
    mockListPosts.mockResolvedValue({
      success: true,
      data: {
        data: [
          { id: "pub", title: "Published", is_published: true, updated_at: "2024-05-01T00:00:00Z" },
          { id: "draft-old", title: "Old Draft", is_published: false, updated_at: "2024-02-01T00:00:00Z" },
          { id: "draft-new", title: "Newest Draft", is_published: false, updated_at: "2024-04-01T00:00:00Z" },
        ],
      },
    });
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText("Edit Latest Draft")).toBeInTheDocument();
    });
    const item = screen.getByText("Edit Latest Draft").closest("[data-testid='command-item']");
    fireEvent.click(item!);
    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith("/posts#edit-draft-new");
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("falls back to the new-post editor when no drafts exist", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText("Edit Latest Draft")).toBeInTheDocument();
    });
    const item = screen.getByText("Edit Latest Draft").closest("[data-testid='command-item']");
    fireEvent.click(item!);
    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith("/posts#new");
    });
  });

  it("hides the edit-item group until the user types", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });
    // Empty query: existing items must not clutter the palette.
    expect(screen.queryByText("Data Pipeline")).not.toBeInTheDocument();
  });

  it("lists existing items and deep-links to a named item's editor", async () => {
    mockListProjects.mockResolvedValue({
      success: true,
      data: { data: [{ id: "pr1", title: "Data Pipeline", category: "Data" }] },
    });
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId("command-input"), { target: { value: "pipeline" } });
    await waitFor(() => {
      expect(screen.getByText("Data Pipeline")).toBeInTheDocument();
    });
    const item = screen.getByText("Data Pipeline").closest("[data-testid='command-item']");
    fireEvent.click(item!);
    expect(mockSetLocation).toHaveBeenCalledWith("/projects#edit-pr1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("navigates to page when clicking an item", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      const overviewItem = screen.getByText("Overview").closest("[data-testid='command-item']");
      fireEvent.click(overviewItem!);
    });
    expect(mockSetLocation).toHaveBeenCalledWith("/overview");
  });

  it("closes after selecting an item", async () => {
    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      const overviewItem = screen.getByText("Overview").closest("[data-testid='command-item']");
      fireEvent.click(overviewItem!);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens and closes with Ctrl+K toggle", async () => {
    render(<SearchPalette />);
    // Open
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    // Close via Ctrl+K again
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("does not open while another dialog is open (no stacking)", () => {
    // Simulate a dialog opened by a page component the shell can't see.
    const blocker = document.createElement("div");
    blocker.setAttribute("role", "dialog");
    document.body.appendChild(blocker);

    render(<SearchPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    // The palette must stay closed — use the testid so the blocker's own
    // role="dialog" doesn't confuse the query.
    expect(screen.queryByTestId("command-dialog")).not.toBeInTheDocument();
    blocker.remove();
  });
});
