import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderAdmin } from "./helpers";
import { screen, within, waitFor } from "@testing-library/react";
import Sidebar from "@/components/Sidebar";

let mockLocation = "/";

vi.mock("wouter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wouter")>();
  return {
    ...actual,
    useLocation: () => [mockLocation, vi.fn()],
  };
});

// The badge only renders when Supabase is configured — unlike the
// aria-current suite, this one exercises the real badge path.
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
  mockLocation = "/";
  return renderAdmin(<Sidebar open={true} onClose={() => {}} />);
}

function messagesLink() {
  const link = screen.getByText("Messages").closest("a");
  if (!link) throw new Error("Messages nav link not found");
  return link;
}

describe("Sidebar Messages badge — matches the API unread-count endpoint exactly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnreadCount.mockResolvedValue({ success: true, data: 7 });
  });

  it("renders exactly the API unread-count value on the Messages link", async () => {
    renderSidebar();
    // The badge is API-backed: it must render the exact count the unread-count
    // query returns (nothing else) once the query resolves.
    await waitFor(() => {
      expect(mockUnreadCount).toHaveBeenCalled();
      expect(within(messagesLink()).getByText("7")).toBeInTheDocument();
    });
  });

  it("renders no badge when the API reports zero unread", async () => {
    mockUnreadCount.mockResolvedValue({ success: true, data: 0 });
    renderSidebar();
    await waitFor(() => expect(mockUnreadCount).toHaveBeenCalled());
    // Badge must be absent (counts only unread — nothing to show).
    expect(within(messagesLink()).queryByText("0")).not.toBeInTheDocument();
    expect(within(messagesLink()).queryByText("7")).not.toBeInTheDocument();
  });

  it("hides the badge when the unread-count query errors (no bogus total)", async () => {
    mockUnreadCount.mockRejectedValue(new Error("boom"));
    renderSidebar();
    await waitFor(() => expect(mockUnreadCount).toHaveBeenCalled());
    expect(within(messagesLink()).queryByText("7")).not.toBeInTheDocument();
  });
});
