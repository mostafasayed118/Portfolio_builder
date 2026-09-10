import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Overview from "@/pages/Overview";

const mockUseQuery = vi.fn();
let mockSupabaseConfigured = false;

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(() => ({})),
  get isSupabaseConfigured() { return mockSupabaseConfigured; },
}));

vi.mock("@/components/StatsBar", () => ({
  StatsBar: () => <div data-testid="stats-bar">Stats</div>,
}));

vi.mock("@/components/SeedDialog", () => ({
  SeedDialog: () => <div data-testid="seed-dialog">Seed</div>,
}));

vi.mock("wouter", () => ({
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) =>
    <a href={href} className={className} data-testid="wouter-link">{children}</a>,
}));

describe("Overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseConfigured = false;
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    localStorage.clear();
  });

  it("renders page heading", () => {
    render(<Overview />);
    expect(screen.getByText("Portfolio CMS")).toBeInTheDocument();
  });

  it("shows Supabase not connected badge when not configured", () => {
    render(<Overview />);
    expect(screen.getByText("Supabase not connected")).toBeInTheDocument();
  });

  it("renders all module groups", () => {
    render(<Overview />);
    for (const group of ["Appearance", "Content", "Inbox", "Site"]) {
      expect(screen.getByText(group)).toBeInTheDocument();
    }
  });

  it("renders all module cards", () => {
    render(<Overview />);
    const modules = [
      "Theme Manager", "Typography", "Section Order", "Hero", "About",
      "Skills", "Projects", "Experience", "Certifications",
      "Contact", "Messages", "SEO", "Site Settings",
    ];
    for (const name of modules) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("does not render StatsBar or SeedDialog when Supabase not configured", () => {
    render(<Overview />);
    expect(screen.queryByTestId("stats-bar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("seed-dialog")).not.toBeInTheDocument();
  });

  it("renders StatsBar and SeedDialog when Supabase is configured", () => {
    mockSupabaseConfigured = true;
    render(<Overview />);
    expect(screen.getByTestId("stats-bar")).toBeInTheDocument();
    expect(screen.getByTestId("seed-dialog")).toBeInTheDocument();
  });

  it("all module links point to valid paths", () => {
    render(<Overview />);
    const expectedPaths = [
      "/theme", "/typography", "/sections", "/hero", "/about",
      "/skills", "/projects", "/experience", "/certifications",
      "/contact", "/messages", "/seo", "/settings",
    ];
    const links = screen.getAllByTestId("wouter-link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    for (const path of expectedPaths) {
      expect(hrefs).toContain(path);
    }
  });

  it("shows the first-visit welcome nudge explaining the admin surface", () => {
    render(<Overview />);
    const tip = screen.getByRole("status");
    expect(tip).toHaveTextContent(/Welcome to your portfolio CMS/i);
    expect(tip).toHaveTextContent(/answer Messages/i);
  });

  it("dismissing the welcome nudge hides it permanently", async () => {
    const first = render(<Overview />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss welcome tip" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(localStorage.getItem("overview-welcome-dismissed")).toBe("1");
    first.unmount();

    // A fresh mount never shows it again.
    render(<Overview />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("hides the welcome nudge when already dismissed", () => {
    localStorage.setItem("overview-welcome-dismissed", "1");
    render(<Overview />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});