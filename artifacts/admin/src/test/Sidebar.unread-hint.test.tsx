import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderAdmin } from "./helpers";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import Sidebar from "@/components/Sidebar";

let mockLocation = "/overview";

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

const { mockUnreadCount } = vi.hoisted(() => ({
  mockUnreadCount: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: { messages: { unreadCount: mockUnreadCount } },
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

// The nudge's text includes a dynamic count, so its unique dismiss button is
// the reliable presence marker.
const hintDismiss = () =>
  screen.queryByRole("button", { name: "Dismiss unread inbox hint" });

describe("Sidebar unread-inbox nudge — one-time badge discoverability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLocation = "/overview";
    mockUnreadCount.mockResolvedValue({ success: true, data: 3 });
  });

  it("shows the nudge with the live unread count on a non-Messages page", async () => {
    renderSidebar();
    // Wait for the count to resolve INTO the component, not just the fetch.
    await waitFor(() => expect(hintDismiss()).toBeInTheDocument());
    expect(localStorage.getItem("messages-unread-hint-dismissed")).toBeNull();
  });

  it("stays hidden when there are no unread messages", async () => {
    mockUnreadCount.mockResolvedValue({ success: true, data: 0 });
    renderSidebar();
    await waitFor(() => expect(mockUnreadCount).toHaveBeenCalled());
    expect(hintDismiss()).not.toBeInTheDocument();
  });

  it("stays hidden on the Messages page itself (the badge is already in view)", async () => {
    mockLocation = "/messages";
    renderSidebar();
    await waitFor(() => expect(mockUnreadCount).toHaveBeenCalled());
    expect(hintDismiss()).not.toBeInTheDocument();
  });

  it("dismisses via its close button and never returns", async () => {
    const first = renderSidebar();
    await waitFor(() => expect(hintDismiss()).toBeInTheDocument());

    // The ✕ lives inside the OneTimeHint.
    fireEvent.click(screen.getByRole("button", { name: "Dismiss unread inbox hint" }));
    expect(hintDismiss()).not.toBeInTheDocument();
    expect(localStorage.getItem("messages-unread-hint-dismissed")).toBe("1");
    first.unmount();

    renderSidebar();
    await waitFor(() => expect(mockUnreadCount).toHaveBeenCalled());
    expect(hintDismiss()).not.toBeInTheDocument();
  });

  it("auto-dismisses forever once the user lands on the Messages inbox", async () => {
    const first = renderSidebar();
    await waitFor(() => expect(hintDismiss()).toBeInTheDocument());
    first.unmount();

    // Navigating to /messages persists the dismissal…
    mockLocation = "/messages";
    renderSidebar();
    await waitFor(() => expect(mockUnreadCount).toHaveBeenCalled());
    expect(localStorage.getItem("messages-unread-hint-dismissed")).toBe("1");

    // …so returning to another page with unread still > 0 never shows it.
    mockLocation = "/overview";
    renderSidebar();
    await waitFor(() => expect(mockUnreadCount).toHaveBeenCalled());
    expect(hintDismiss()).not.toBeInTheDocument();
  });
});
