import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderAdmin, setClerk } from "./helpers";
import { screen } from "@testing-library/react";
import Sidebar from "@/components/Sidebar";

let mockLocation = "/";

vi.mock("wouter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wouter")>();
  return {
    ...actual,
    useLocation: () => [mockLocation, vi.fn()],
  };
});

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: false,
  getSupabase: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({
  api: { messages: { unreadCount: vi.fn().mockResolvedValue({ success: true, data: 0 }) } },
}));
vi.mock("@/hooks/usePrefetchRoutes", () => ({
  usePrefetch: () => ({ prefetch: vi.fn() }),
}));
vi.mock("@/lib/nav-config", () => ({
  NAV_GROUPS: ["Appearance", "Content"],
  NAV_ITEMS: [
    { path: "/overview", label: "Overview", group: "Appearance", icon: () => null },
    { path: "/projects", label: "Projects", group: "Content", icon: () => null },
    { path: "/messages", label: "Messages", group: "Content", icon: () => null },
  ],
}));
vi.mock("@workspace/auth", () => ({
  useAuthUser: () => ({ signOut: vi.fn() }),
}));

function renderSidebar(currentPath: string) {
  mockLocation = currentPath;
  return renderAdmin(<Sidebar open={true} onClose={() => {}} />);
}

describe("Sidebar — UX-029 regression: active link uses aria-current='page'", () => {
  beforeEach(() => {
    setClerk({ isSignedIn: true, isLoaded: true, email: "admin@test.com" });
  });

  it("the active link has aria-current='page' and inactive links do not", () => {
    renderSidebar("/overview");
    const overviewLink = screen.getByText("Overview").closest("a");
    const projectsLink = screen.getByText("Projects").closest("a");
    expect(overviewLink).toHaveAttribute("aria-current", "page");
    expect(projectsLink).not.toHaveAttribute("aria-current");
  });

  it("the active link switches when the route changes", () => {
    renderSidebar("/projects");
    const projectsLink = screen.getByText("Projects").closest("a");
    const overviewLink = screen.getByText("Overview").closest("a");
    expect(projectsLink).toHaveAttribute("aria-current", "page");
    expect(overviewLink).not.toHaveAttribute("aria-current");
  });
});
