import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderAdmin } from "./helpers";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessagesManager } from "@/features/messages";

const { mockList, mockMarkRead, mockMarkAllRead, mockDelete, mockUnreadCount, mockToast } = vi.hoisted(
  () => ({
    mockList: vi.fn(),
    mockMarkRead: vi.fn(),
    mockMarkAllRead: vi.fn(),
    mockDelete: vi.fn(),
    mockUnreadCount: vi.fn(),
    mockToast: vi.fn(),
  }),
);

vi.mock("@/lib/api-client", () => ({
  api: {
    messages: {
      list: mockList,
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      delete: mockDelete,
      unreadCount: mockUnreadCount,
    },
  },
  getCsrfToken: vi.fn(),
}));

vi.mock("@/components/SmartConfirmDialog", () => ({
  SmartConfirmDialog: ({ onConfirm }: { onConfirm: () => void }) => (
    <button data-testid="confirm-delete" onClick={onConfirm}>Confirm</button>
  ),
}));
vi.mock("@/components/SmartEmptyState", () => ({
  // MessagesManager imports the NAMED export; a `default`-only stub throws
  // once the empty state actually renders (e.g. an empty list page).
  SmartEmptyState: () => null,
  default: () => null,
}));
vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return { ...actual, useToast: () => ({ toast: mockToast }) };
});
vi.mock("@/lib/error-messages", () => ({ getErrorMessage: () => "Error" }));

const fakeMsgs = [
  { id: "1", name: "Alice", email: "alice@x.com", subject: "Hi", message: "First message", status: "unread", created_at: "2024-01-01T00:00:00Z" },
  { id: "2", name: "Bob", email: "bob@x.com", subject: "Yo", message: "Second message", status: "read", created_at: "2024-01-02T00:00:00Z" },
  { id: "3", name: "Cara", email: "cara@x.com", subject: "Re", message: "Third message", status: "archived", created_at: "2024-01-03T00:00:00Z" },
];

describe("MessagesManager — UX-025 regression + a11y + mark-read flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The collection endpoint returns the paginated envelope the batched
    // fetcher unwraps — a bare array would read as an empty page.
    mockList.mockResolvedValue({
      success: true,
      data: {
        data: fakeMsgs,
        pagination: { total: fakeMsgs.length, limit: 200, offset: 0, hasMore: false },
      },
    });
    mockMarkRead.mockResolvedValue({ success: true });
    mockMarkAllRead.mockResolvedValue({ success: true, data: { marked: 2 } });
    mockDelete.mockResolvedValue({ success: true });
    mockUnreadCount.mockResolvedValue({ success: true, data: 1 });
  });

  it("filter bar buttons use the tablist/tab role with aria-selected (UX-025)", async () => {
    renderAdmin(<MessagesManager />);
    await waitFor(() => screen.getByText("Messages"));
    const tablist = await screen.findByRole("tablist");
    expect(tablist).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(3);
    const allTab = tabs.find((t) => t.textContent?.match(/all/i));
    expect(allTab).toHaveAttribute("aria-selected", "true");
  });

  it("clicking the mark-read button calls api.messages.markRead", async () => {
    const user = userEvent.setup();
    renderAdmin(<MessagesManager />);
    await waitFor(() => screen.getByText("Alice"));

    const markReadBtn = screen.getByRole("button", { name: /mark message from alice as read/i });
    await user.click(markReadBtn);

    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith("1");
    });
  });

  it("'Mark All Read' marks every unread message via the server-side endpoint", async () => {
    const user = userEvent.setup();
    renderAdmin(<MessagesManager />);
    await waitFor(() => screen.getByText("Alice"));

    const markAll = screen.getByRole("button", { name: /mark all read/i });
    await user.click(markAll);

    await waitFor(() => {
      expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
    });
    // Server-side single statement — no per-message markRead calls (which
    // could only ever reach the first 50-row page).
    expect(mockMarkRead).not.toHaveBeenCalled();
  });
});
