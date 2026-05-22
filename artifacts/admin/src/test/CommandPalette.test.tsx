import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CommandPalette from "@/components/CommandPalette";

const mockSetLocation = vi.fn();
vi.mock("wouter", () => ({
  useLocation: () => ["/", mockSetLocation],
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
      <input placeholder={placeholder} data-testid="command-input" {...props} />
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

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is closed by default", () => {
    render(<CommandPalette />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens on Ctrl+K", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("opens on Cmd+K (Mac)", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("has a search input", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });
  });

  it("input has correct placeholder", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Type a command or search...")).toBeInTheDocument();
    });
  });

  it("shows all navigation groups", async () => {
    render(<CommandPalette />);
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
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });
  });

  it("contains all content items", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      for (const item of ["Hero", "About", "Projects", "Skills", "Experience", "Certifications"]) {
        expect(screen.getByText(item)).toBeInTheDocument();
      }
    });
  });

  it("contains all site items", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      for (const item of ["CV / Resume", "SEO", "Typography", "Section Order", "Theme", "Site Settings"]) {
        expect(screen.getByText(item)).toBeInTheDocument();
      }
    });
  });

  it("contains Quick Actions", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      for (const item of ["View Live Portfolio", "Add New Project", "Add New Skill", "Add New Experience"]) {
        expect(screen.getByText(item)).toBeInTheDocument();
      }
    });
  });

  it("navigates to page when clicking an item", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      const overviewItem = screen.getByText("Overview").closest("[data-testid='command-item']");
      fireEvent.click(overviewItem!);
    });
    expect(mockSetLocation).toHaveBeenCalledWith("/overview");
  });

  it("closes after selecting an item", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      const overviewItem = screen.getByText("Overview").closest("[data-testid='command-item']");
      fireEvent.click(overviewItem!);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens and closes with Ctrl+K toggle", async () => {
    render(<CommandPalette />);
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
});
