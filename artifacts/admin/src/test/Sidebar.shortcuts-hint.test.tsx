import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderAdmin } from "./helpers";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import Sidebar from "@/components/Sidebar";

let mockLocation = "/messages";

vi.mock("wouter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wouter")>();
  return {
    ...actual,
    useLocation: () => [mockLocation, vi.fn()],
  };
});

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  getSupabase: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: { messages: { unreadCount: vi.fn() } },
}));
vi.mock("@/hooks/usePrefetchRoutes", () => ({
  usePrefetch: () => ({ prefetch: vi.fn() }),
}));
vi.mock("@/lib/nav-config", () => ({
  NAV_GROUPS: ["Inbox"],
  NAV_ITEMS: [
    { path: "/overview", label: "Overview", group: "Inbox", icon: () => null },
    { path: "/messages", label: "Messages", group: "Inbox", icon: () => null },
  ],
}));
vi.mock("@workspace/auth", () => ({
  useAuthUser: () => ({ signOut: vi.fn() }),
}));

function renderSidebar() {
  return renderAdmin(<Sidebar open={true} onClose={() => {}} />);
}

// The hint's text is split by a <kbd> chip, so its unique dismiss button is
// the reliable presence marker.
const hintDismiss = () =>
  screen.queryByRole("button", { name: "Dismiss shortcuts hint" });

describe("Sidebar shortcuts hint — one-time '?' nudge on the Messages page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLocation = "/messages";
  });

  it("shows the hint on the Messages page on first visit", () => {
    renderSidebar();
    expect(hintDismiss()).toBeInTheDocument();
    expect(localStorage.getItem("messages-shortcuts-hint-dismissed")).toBeNull();
  });

  it("hides the hint on other pages (the ? key is page-scoped to Messages)", () => {
    mockLocation = "/overview";
    renderSidebar();
    expect(hintDismiss()).not.toBeInTheDocument();
  });

  it("dismisses via its close button and never returns", () => {
    const first = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss shortcuts hint" }));
    expect(hintDismiss()).not.toBeInTheDocument();
    expect(localStorage.getItem("messages-shortcuts-hint-dismissed")).toBe("1");
    first.unmount();

    renderSidebar();
    expect(hintDismiss()).not.toBeInTheDocument();
  });

  it("auto-dismisses once the shortcuts modal is opened elsewhere", async () => {
    const first = renderSidebar();
    expect(hintDismiss()).toBeInTheDocument();

    // MessagesManager dispatches this when the shortcuts modal opens (via the
    // ? key or the header icon) — the hint has served its purpose. The event
    // fires outside React's act, so flush the state update.
    window.dispatchEvent(new Event("messages:shortcuts-opened"));
    await waitFor(() => expect(hintDismiss()).not.toBeInTheDocument());
    expect(localStorage.getItem("messages-shortcuts-hint-dismissed")).toBe("1");
    first.unmount();

    renderSidebar();
    expect(hintDismiss()).not.toBeInTheDocument();
  });
});
