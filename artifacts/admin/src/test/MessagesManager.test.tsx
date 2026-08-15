import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderAdmin } from "./helpers";
import { MessagesManager } from "@/features/messages";

const {
  mockListMessages,
  mockMarkMessageRead,
  mockMarkAllRead,
  mockArchiveMessage,
  mockUnarchiveMessage,
  mockBulkArchiveMessage,
  mockBulkUnarchiveMessage,
  mockArchiveTestSubmissions,
  mockUnreadCount,
} = vi.hoisted(() => ({
  mockListMessages: vi.fn(),
  mockMarkMessageRead: vi.fn(),
  mockMarkAllRead: vi.fn(),
  mockArchiveMessage: vi.fn(),
  mockUnarchiveMessage: vi.fn(),
  mockBulkArchiveMessage: vi.fn(),
  mockBulkUnarchiveMessage: vi.fn(),
  mockArchiveTestSubmissions: vi.fn(),
  mockUnreadCount: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(() => ({})),
  isSupabaseConfigured: true,
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    messages: {
      list: mockListMessages,
      unreadCount: mockUnreadCount,
      markRead: mockMarkMessageRead,
      markAllRead: mockMarkAllRead,
      archive: mockArchiveMessage,
      unarchive: mockUnarchiveMessage,
      bulkArchive: mockBulkArchiveMessage,
      bulkUnarchive: mockBulkUnarchiveMessage,
      archiveTestSubmissions: mockArchiveTestSubmissions,
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

const mockMessages = [
  {
    id: "1",
    name: "Alice",
    email: "alice@test.com",
    message: "Hello there!",
    status: "unread",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Bob",
    email: "bob@test.com",
    message: "Hi from Bob",
    status: "read",
    created_at: "2024-01-02T00:00:00Z",
  },
  {
    id: "3",
    name: "Charlie",
    email: "charlie@test.com",
    message: "Archived message",
    status: "archived",
    created_at: "2024-01-03T00:00:00Z",
  },
];

describe("MessagesViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The list endpoint applies the server-side `status` filter — the mock
    // stands in for it, so filtered views only return matching rows (the
    // same contract the real endpoint honors).
    mockListMessages.mockImplementation(async (_userId, status) => {
      const list = mockMessages.filter((m) => {
        if (status === "unread") return m.status === "unread";
        if (status === "read") return m.status === "read";
        if (status === "archived") return m.status === "archived";
        return true;
      });
      return { success: true, data: list };
    });
    mockMarkMessageRead.mockResolvedValue({ success: true });
    mockMarkAllRead.mockResolvedValue({ success: true, data: { marked: 2 } });
    mockArchiveMessage.mockResolvedValue({ success: true });
    mockUnarchiveMessage.mockResolvedValue({ success: true });
    mockBulkArchiveMessage.mockResolvedValue({ success: true });
    mockBulkUnarchiveMessage.mockResolvedValue({ success: true });
    mockArchiveTestSubmissions.mockResolvedValue({ success: true, data: { archived: 3 } });
    // The unread chip/tab count is API-backed (matches the sidebar badge).
    mockUnreadCount.mockResolvedValue({ success: true, data: 1 });
  });

  it("renders messages table", async () => {
    renderAdmin(<MessagesManager />);

    expect(await screen.findByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.getByText("3 total messages from the contact form.")).toBeInTheDocument();
  });

  it("filters by All/Unread/Read tabs", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();

    await userEvent.click(screen.getByText(/Unread \(1\)/));
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText(/Read \(1\)/));
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
  });

  it("passes the active chip to the collection endpoint so Unread pages server-side", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");
    // Initial load fetches the default (all) view with no status.
    expect(mockListMessages).toHaveBeenCalledWith(undefined);

    await userEvent.click(screen.getByText(/Unread \(1\)/));

    // The Unread chip must refetch with the status param — not filter the
    // already-fetched page client-side (which truncates past 50 rows).
    await waitFor(() => {
      expect(mockListMessages).toHaveBeenCalledWith(undefined, "unread");
    });
  });

  it("marks message as read on click", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    const markReadBtn = screen.getByRole("button", { name: /mark message from alice as read/i });
    await userEvent.click(markReadBtn);

    await waitFor(() => {
      expect(mockMarkMessageRead).toHaveBeenCalledWith("1");
    });
  });

  it("marks ALL unread messages as read via the server-side endpoint", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    await userEvent.click(screen.getByRole("button", { name: "Mark All Read" }));

    await waitFor(() => {
      expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
    });
    // The old behavior looped over the fetched page (per-message markRead);
    // the server-side endpoint must be the only call made.
    expect(mockMarkMessageRead).not.toHaveBeenCalled();
  });

  it("archives a message on the archive button click", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    const archiveBtn = screen.getByRole("button", { name: /archive message from alice/i });
    await userEvent.click(archiveBtn);

    await waitFor(() => {
      expect(mockArchiveMessage).toHaveBeenCalledWith("1");
    });
  });

  it("bulk-archives selected messages", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Alice" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Bob" }));

    // Selection toolbar appears with the count.
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Archive selected" }));

    await waitFor(() => {
      expect(mockBulkArchiveMessage).toHaveBeenCalledWith(["1", "2"]);
    });

    // Selection clears after archiving.
    await waitFor(() => {
      expect(screen.queryByText("2 selected")).not.toBeInTheDocument();
    });
  });

  it("selects every message on the current page via the toolbar checkbox", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    // The toolbar is visible with zero selected so the select-all control
    // is always reachable.
    expect(screen.getByText("0 selected")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "Select all on page" }));

    for (const name of ["Alice", "Bob", "Charlie"]) {
      expect(
        screen.getByRole("checkbox", { name: `Select message from ${name}` }),
      ).toBeChecked();
    }
    expect(screen.getByText("3 selected")).toBeInTheDocument();
  });

  it("select-all on page toggles off when everything is already selected", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    const selectAll = screen.getByRole("checkbox", { name: "Select all on page" });
    await userEvent.click(selectAll);
    expect(screen.getByText("3 selected")).toBeInTheDocument();

    await userEvent.click(selectAll);
    expect(screen.getByText("0 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Select message from Alice" }),
    ).not.toBeChecked();
  });

  it("archives all selected from the select-all toolbar action", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    await userEvent.click(screen.getByRole("checkbox", { name: "Select all on page" }));
    await userEvent.click(screen.getByRole("button", { name: "Archive selected" }));

    await waitFor(() => {
      expect(mockBulkArchiveMessage).toHaveBeenCalledWith(["1", "2", "3"]);
    });
    // Selection clears after archiving.
    await waitFor(() => {
      expect(screen.queryByText("3 selected")).not.toBeInTheDocument();
    });
  });

  it("restores selected archived rows from the Archived tab in one click", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    // Switch to the Archived tab (server-filtered to archived rows only).
    await userEvent.click(screen.getByText(/Archived \(1\)/));
    await screen.findByText("Charlie");

    // The toolbar's bulk action flips to "Restore selected" in this view.
    expect(
      screen.getByRole("button", { name: "Restore selected" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Archive selected" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "Select all on page" }));
    await userEvent.click(screen.getByRole("button", { name: "Restore selected" }));

    await waitFor(() => {
      expect(mockBulkUnarchiveMessage).toHaveBeenCalledWith(["3"]);
    });
  });

  it("archives all test submissions from the one-click action", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    await userEvent.click(
      screen.getByRole("button", { name: "Archive test submissions" }),
    );

    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByText("Archive test submissions"));

    await waitFor(() => {
      expect(mockArchiveTestSubmissions).toHaveBeenCalledTimes(1);
    });
  });

  it("clears the selection when the filter changes", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Alice" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    await userEvent.click(screen.getByText(/Unread \(1\)/));
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
  });

  it("unarchives an archived message", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Charlie");

    // The archived message shows the unarchive action, not archive.
    expect(
      screen.queryByRole("button", { name: "Archive message from Charlie" }),
    ).not.toBeInTheDocument();
    const unarchiveBtn = screen.getByRole("button", { name: "Unarchive message from Charlie" });
    await userEvent.click(unarchiveBtn);

    await waitFor(() => {
      expect(mockUnarchiveMessage).toHaveBeenCalledWith("3");
    });
  });

  it("shows empty state when no messages", async () => {
    mockListMessages.mockResolvedValue({ success: true, data: [] });

    renderAdmin(<MessagesManager />);

    expect(
      await screen.findByText("No messages yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Messages from your contact form will appear here"),
    ).toBeInTheDocument();
  });
});
