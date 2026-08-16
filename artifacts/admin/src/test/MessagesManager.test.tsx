import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderAdmin } from "./helpers";
import { MessagesManager } from "@/features/messages";
import { SHORTCUTS_OPENED_EVENT } from "@/components/ShortcutsDialog";

const {
  mockListMessages,
  mockMarkMessageRead,
  mockMarkAllRead,
  mockArchiveMessage,
  mockUnarchiveMessage,
  mockBulkArchiveMessage,
  mockBulkUnarchiveMessage,
  mockArchiveTestSubmissions,
  mockRestoreAllArchived,
  mockUnreadCount,
  mockToast,
} = vi.hoisted(() => ({
  mockListMessages: vi.fn(),
  mockMarkMessageRead: vi.fn(),
  mockMarkAllRead: vi.fn(),
  mockArchiveMessage: vi.fn(),
  mockUnarchiveMessage: vi.fn(),
  mockBulkArchiveMessage: vi.fn(),
  mockBulkUnarchiveMessage: vi.fn(),
  mockArchiveTestSubmissions: vi.fn(),
  mockRestoreAllArchived: vi.fn(),
  mockUnreadCount: vi.fn(),
  mockToast: vi.fn(),
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
      restoreAllArchived: mockRestoreAllArchived,
    },
  },
}));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
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
    // The one-time shortcut hint persists in localStorage — reset between
    // tests so each starts from a genuine "first visit".
    localStorage.clear();
    // The list endpoint applies the server-side `status`/`preset` filter AND
    // pages by limit/offset — the mock stands in for both, so filtered views
    // only return matching rows and the batched fetcher gets a real
    // short-page termination (same contract the real endpoint honors).
    mockListMessages.mockImplementation(async (_userId, status, limit = 200, offset = 0, preset) => {
      const list = mockMessages.filter((m) => {
        if (preset === "unread_today") return m.status === "unread";
        if (preset === "unread_or_archived")
          return m.status === "unread" || m.status === "archived";
        if (preset === "needs_reply") return m.status === "read";
        if (status === "unread") return m.status === "unread";
        if (status === "read") return m.status === "read";
        if (status === "archived") return m.status === "archived";
        return true;
      });
      const page = list.slice(offset, offset + limit);
      return {
        success: true,
        data: {
          data: page,
          pagination: {
            total: list.length,
            limit,
            offset,
            hasMore: offset + page.length < list.length,
          },
        },
      };
    });
    mockMarkMessageRead.mockResolvedValue({ success: true });
    mockMarkAllRead.mockResolvedValue({ success: true, data: { marked: 2 } });
    mockArchiveMessage.mockResolvedValue({ success: true });
    mockUnarchiveMessage.mockResolvedValue({ success: true });
    mockBulkArchiveMessage.mockResolvedValue({ success: true });
    mockBulkUnarchiveMessage.mockResolvedValue({ success: true });
    mockArchiveTestSubmissions.mockResolvedValue({ success: true, data: { archived: 3 } });
    mockRestoreAllArchived.mockResolvedValue({ success: true, data: { restored: 3 } });
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
    // Initial load fetches the default (all) view — no status or preset,
    // first batch at offset 0 with the max page size.
    expect(mockListMessages).toHaveBeenCalledWith(undefined, undefined, 200, 0, undefined);

    await userEvent.click(screen.getByText(/Unread \(1\)/));

    // The Unread chip must refetch with the status param — not filter the
    // already-fetched page client-side (which truncates past 50 rows).
    await waitFor(() => {
      expect(mockListMessages).toHaveBeenCalledWith(undefined, "unread", 200, 0, undefined);
    });
  });

  it("fetches every matching row in batches instead of stopping at the first 50", async () => {
    const many = Array.from({ length: 250 }, (_, i) => ({
      id: String(i + 1),
      name: `Person ${i + 1}`,
      email: `p${i + 1}@test.com`,
      message: `Message ${i + 1}`,
      status: "unread",
      created_at: new Date(Date.UTC(2024, 0, i + 1)).toISOString(),
    }));
    mockListMessages.mockImplementation(async (_userId, status, limit = 200, offset = 0) => {
      const page = many.slice(offset, offset + limit);
      return {
        success: true,
        data: {
          data: page,
          pagination: {
            total: many.length,
            limit,
            offset,
            hasMore: offset + page.length < many.length,
          },
        },
      };
    });

    renderAdmin(<MessagesManager />);

    // The batched fetcher walks the whole set: 200 + 50 — it never stops at
    // the server's default 50-row page.
    await waitFor(() => {
      expect(mockListMessages).toHaveBeenCalledTimes(2);
    });
    expect(mockListMessages).toHaveBeenNthCalledWith(1, undefined, undefined, 200, 0, undefined);
    expect(mockListMessages).toHaveBeenNthCalledWith(2, undefined, undefined, 200, 200, undefined);

    // The footer reports the true total, not the first page's length.
    expect(await screen.findByText(/Showing 1–20 of 250/)).toBeInTheDocument();

    // Rows past the old 50-row cutoff are actually reachable: page 3 shows
    // Person 51, proving the chips page over the complete fetched set.
    const next = screen.getByRole("button", { name: "Next" });
    await userEvent.click(next);
    await userEvent.click(next);
    expect(screen.getByText("Person 51")).toBeInTheDocument();
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
      expect(mockBulkArchiveMessage).toHaveBeenCalledWith({ ids: ["1", "2"] });
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

  it("shows the selected count in the tab title", async () => {
    document.title = "Admin";
    renderAdmin(<MessagesManager />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(document.title).toBe("Admin");

    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Alice" }));
    expect(document.title).toBe("(1) Admin");

    // Selecting more rows bumps the count.
    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Bob" }));
    expect(document.title).toBe("(2) Admin");

    // Clearing the selection restores the plain title.
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(document.title).toBe("Admin");
  });

  it("selects the whole page with Ctrl/Cmd+A and toggles off on a second press", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    fireEvent.keyDown(document, { key: "a", ctrlKey: true });

    for (const name of ["Alice", "Bob", "Charlie"]) {
      expect(
        screen.getByRole("checkbox", { name: `Select message from ${name}` }),
      ).toBeChecked();
    }
    expect(screen.getByText("3 selected")).toBeInTheDocument();

    // A second press clears the page selection, matching the toolbar toggle.
    fireEvent.keyDown(document, { key: "a", ctrlKey: true });
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });

  it("confirms the Ctrl+A action with a toast", async () => {
    renderAdmin(<MessagesManager />);
    await screen.findByText("Alice");

    fireEvent.keyDown(document, { key: "a", ctrlKey: true });
    expect(mockToast).toHaveBeenCalledWith({ title: "Selected 3 on this page" });

    fireEvent.keyDown(document, { key: "a", ctrlKey: true });
    expect(mockToast).toHaveBeenCalledWith({ title: "Selection cleared" });
  });

  it("confirms the 'x' action with a toast naming the touched row", async () => {
    renderAdmin(<MessagesManager />);
    await screen.findByText("Alice");

    fireEvent.keyDown(document, { key: "x" });
    expect(mockToast).toHaveBeenCalledWith({ title: "Selected Alice" });

    fireEvent.keyDown(document, { key: "x" });
    expect(mockToast).toHaveBeenCalledWith({ title: "Deselected Alice" });
  });

  it("ignores Ctrl+A while a dialog is open", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    await userEvent.click(
      screen.getByRole("button", { name: "Archive test submissions" }),
    );
    await screen.findByRole("alertdialog");

    fireEvent.keyDown(document, { key: "a", ctrlKey: true });

    // The selection behind the dialog must not change underneath it.
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });

  it("archives the selected messages with the 'e' shortcut", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Alice" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Bob" }));

    fireEvent.keyDown(document, { key: "e" });

    await waitFor(() => {
      expect(mockBulkArchiveMessage).toHaveBeenCalledWith({ ids: ["1", "2"] });
    });
    // Same effect as the toolbar button: the selection clears after archiving.
    await waitFor(() => {
      expect(screen.queryByText("2 selected")).not.toBeInTheDocument();
    });
  });

  it("restores the selected archived messages with the 'u' shortcut", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    await userEvent.click(screen.getByText(/Archived \(1\)/));
    await screen.findByText("Charlie");

    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Charlie" }));

    fireEvent.keyDown(document, { key: "u" });

    // Charlie is the only archived row, so the whole view is selected — the
    // shortcut routes through the same filter path as the toolbar button.
    await waitFor(() => {
      expect(mockBulkUnarchiveMessage).toHaveBeenCalledWith({
        filter: { status: "archived" },
      });
    });
  });

  it("ignores 'e' in the Archived view and 'u' outside it", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    // In All view: 'e' archives but 'u' is a no-op.
    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Alice" }));
    fireEvent.keyDown(document, { key: "u" });
    expect(mockBulkUnarchiveMessage).not.toHaveBeenCalled();

    // In Archived view: 'u' restores but 'e' is a no-op (nothing to archive).
    await userEvent.click(screen.getByText(/Archived \(1\)/));
    await screen.findByText("Charlie");
    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Charlie" }));
    fireEvent.keyDown(document, { key: "e" });
    expect(mockBulkArchiveMessage).not.toHaveBeenCalled();
  });

  it("gates the E/U shortcuts while a dialog is open", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    await userEvent.click(
      screen.getByRole("button", { name: "Archive test submissions" }),
    );
    await screen.findByRole("alertdialog");

    fireEvent.keyDown(document, { key: "e" });
    fireEvent.keyDown(document, { key: "u" });

    expect(mockBulkArchiveMessage).not.toHaveBeenCalled();
    expect(mockBulkUnarchiveMessage).not.toHaveBeenCalled();
  });

  it("replies to the single selected message with the 'r' shortcut", async () => {
    renderAdmin(<MessagesManager />);
    await screen.findByText("Alice");

    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Alice" }));
    fireEvent.keyDown(document, { key: "r" });

    // The same reply dialog the toolbar opens, prefilled for the selection.
    expect(await screen.findByText("Reply to Alice")).toBeInTheDocument();
  });

  it("ignores 'r' with no cursor and no selection", async () => {
    renderAdmin(<MessagesManager />);
    await screen.findByText("Alice");

    // Nothing focused, nothing selected: nothing to reply to.
    fireEvent.keyDown(document, { key: "r" });
    expect(screen.queryByText("Reply to Alice")).not.toBeInTheDocument();
  });

  it("replies to the row under the cursor with 'r' even with a multi-selection", async () => {
    renderAdmin(<MessagesManager />);
    await screen.findByText("Alice");

    // A multi-selection is no longer ambiguous: the cursor (last row
    // interacted with — Bob) is the unambiguous reply target.
    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Alice" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Bob" }));
    fireEvent.keyDown(document, { key: "r" });
    expect(await screen.findByText("Reply to Bob")).toBeInTheDocument();
  });

  it("moves the cursor with ArrowDown and ArrowUp and 'x' toggles the row under it", async () => {
    renderAdmin(<MessagesManager />);
    await screen.findByText("Alice");

    // ArrowDown focuses the first row.
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(
      document.querySelector('[data-message-id="1"]'),
    ).toHaveAttribute("data-focused", "true");

    // ArrowDown again moves the cursor to Bob.
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(
      document.querySelector('[data-message-id="2"]'),
    ).toHaveAttribute("data-focused", "true");
    expect(
      document.querySelector('[data-message-id="1"]'),
    ).not.toHaveAttribute("data-focused");

    // `x` toggles the row under the cursor — Bob — with no mouse interaction.
    fireEvent.keyDown(document, { key: "x" });
    expect(
      screen.getByRole("checkbox", { name: "Select message from Bob" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Select message from Alice" }),
    ).not.toBeChecked();

    // ArrowUp moves back to Alice; `x` toggles her on.
    fireEvent.keyDown(document, { key: "ArrowUp" });
    fireEvent.keyDown(document, { key: "x" });
    expect(
      screen.getByRole("checkbox", { name: "Select message from Alice" }),
    ).toBeChecked();
  });

  it("clamps the cursor at the list edges without wrapping", async () => {
    renderAdmin(<MessagesManager />);
    await screen.findByText("Alice");

    // ArrowUp before anything is focused starts at the first row...
    fireEvent.keyDown(document, { key: "ArrowUp" });
    expect(
      document.querySelector('[data-message-id="1"]'),
    ).toHaveAttribute("data-focused", "true");

    // ...and ArrowDown at the last row stays there.
    fireEvent.keyDown(document, { key: "ArrowDown" });
    fireEvent.keyDown(document, { key: "ArrowDown" });
    fireEvent.keyDown(document, { key: "ArrowDown" });
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(
      document.querySelector('[data-message-id="3"]'),
    ).toHaveAttribute("data-focused", "true");
    expect(
      document.querySelector('[data-message-id="2"]'),
    ).not.toHaveAttribute("data-focused");
  });

  it("replies to the focused row with 'r' after arrow navigation — no selection needed", async () => {
    renderAdmin(<MessagesManager />);
    await screen.findByText("Alice");

    // Cursor to Bob entirely by keyboard, then `r` replies to him.
    fireEvent.keyDown(document, { key: "ArrowDown" });
    fireEvent.keyDown(document, { key: "ArrowDown" });
    fireEvent.keyDown(document, { key: "r" });
    expect(await screen.findByText("Reply to Bob")).toBeInTheDocument();
  });

  it("toggles the focused message with the 'x' shortcut", async () => {
    renderAdmin(<MessagesManager />);
    await screen.findByText("Alice");

    // Toggling Alice's checkbox makes her the focused message; `x` then
    // flips her selection back and forth.
    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Alice" }));
    expect(
      screen.getByRole("checkbox", { name: "Select message from Alice" }),
    ).toBeChecked();

    fireEvent.keyDown(document, { key: "x" });
    expect(
      screen.getByRole("checkbox", { name: "Select message from Alice" }),
    ).not.toBeChecked();

    fireEvent.keyDown(document, { key: "x" });
    expect(
      screen.getByRole("checkbox", { name: "Select message from Alice" }),
    ).toBeChecked();
  });

  it("selects the first row with 'x' when nothing is focused yet", async () => {
    renderAdmin(<MessagesManager />);
    await screen.findByText("Alice");

    fireEvent.keyDown(document, { key: "x" });

    // No row has been interacted with — the key falls back to the first row
    // so it is never dead on a fresh page.
    expect(
      screen.getByRole("checkbox", { name: "Select message from Alice" }),
    ).toBeChecked();
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
      expect(mockBulkArchiveMessage).toHaveBeenCalledWith({ ids: ["1", "2", "3"] });
    });
    // Selection clears after archiving.
    await waitFor(() => {
      expect(screen.queryByText("3 selected")).not.toBeInTheDocument();
    });
  });

  it("applies a saved preset with one click", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    await userEvent.click(screen.getByText("Unread + archived"));

    // The preset must refetch the collection with the preset param (the
    // compound view the status chips can't express) — not filter client-side.
    await waitFor(() => {
      expect(mockListMessages).toHaveBeenCalledWith(undefined, undefined, 200, 0, "unread_or_archived");
    });
    // unread OR archived: Alice (unread) and Charlie (archived) shown, the
    // read-and-visible Bob excluded.
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("clears the active preset when a status chip is clicked", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    await userEvent.click(screen.getByText("Unread today"));
    await waitFor(() => {
      expect(mockListMessages).toHaveBeenCalledWith(undefined, undefined, 200, 0, "unread_today");
    });

    // A status chip replaces the preset view entirely — the preset param is
    // dropped and the status param takes over.
    await userEvent.click(screen.getByText(/Read \(1\)/));
    await waitFor(() => {
      expect(mockListMessages).toHaveBeenCalledWith(undefined, "read", 200, 0, undefined);
    });
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("clears the selection when a preset is applied", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Alice" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Needs reply"));
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
  });

  it("selects every matching row across pages and archives them in one bulk call", async () => {
    const many = Array.from({ length: 250 }, (_, i) => ({
      id: String(i + 1),
      name: `Person ${i + 1}`,
      email: `p${i + 1}@test.com`,
      message: `Message ${i + 1}`,
      status: "unread",
      created_at: new Date(Date.UTC(2024, 0, i + 1)).toISOString(),
    }));
    mockListMessages.mockImplementation(async (_userId, status, limit = 200, offset = 0) => {
      const page = many.slice(offset, offset + limit);
      return {
        success: true,
        data: {
          data: page,
          pagination: {
            total: many.length,
            limit,
            offset,
            hasMore: offset + page.length < many.length,
          },
        },
      };
    });

    renderAdmin(<MessagesManager />);
    await screen.findByText("Person 1");

    // Select the rendered page first (20 rows on page 1), which surfaces the
    // Gmail-style action.
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all on page" }));
    expect(screen.getByText("20 selected")).toBeInTheDocument();

    // One click grabs every matching row across ALL pages.
    await userEvent.click(screen.getByRole("button", { name: "Select all 250 matching" }));
    expect(screen.getByText("250 selected")).toBeInTheDocument();
    // Nothing left to select — the action disappears.
    expect(
      screen.queryByRole("button", { name: "Select all 250 matching" }),
    ).not.toBeInTheDocument();

    // Archiving the selection is ONE bulk call carrying the full id set,
    // reaching rows far beyond the current page.
    await userEvent.click(screen.getByRole("button", { name: "Archive selected" }));
    await waitFor(() => {
      expect(mockBulkArchiveMessage).toHaveBeenCalledTimes(1);
    });
    const input = mockBulkArchiveMessage.mock.calls[0][0] as { ids?: string[] };
    expect(input.ids).toHaveLength(250);
    expect(input.ids).toContain("250");
  });

  it("archives the whole filtered view via the filter when every matching row is selected", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    await userEvent.click(screen.getByText(/Unread \(1\)/));
    await screen.findByText("Alice");

    // Selecting the only matching unread row means the whole view is
    // selected — the archive must send the server-side filter, not a
    // one-row id payload, so it scales to thousands of matches.
    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Alice" }));
    await userEvent.click(screen.getByRole("button", { name: "Archive selected" }));

    await waitFor(() => {
      expect(mockBulkArchiveMessage).toHaveBeenCalledWith({ filter: { status: "unread" } });
    });
  });

  it("hides the select-all-matching action when the page holds every matching row", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    // With only 3 matching rows and a page that fits all of them, selecting
    // the page already selects everything — no cross-page action needed.
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all on page" }));
    expect(screen.getByText("3 selected")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Select all 3 matching" }),
    ).not.toBeInTheDocument();
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

    // Selecting the ONLY archived row means the whole Archived view is
    // selected — the restore sends the server-side filter, not a one-row id
    // payload, so it scales to thousands of archived rows.
    await waitFor(() => {
      expect(mockBulkUnarchiveMessage).toHaveBeenCalledWith({
        filter: { status: "archived" },
      });
    });
  });

  it("restores a PARTIAL selection by id list in the Archived tab", async () => {
    // Two archived rows: selecting just one is a partial selection, so the
    // restore must carry the explicit ids — never the whole-archived filter.
    const archived = [
      {
        id: "a1",
        name: "Dana",
        email: "dana@test.com",
        message: "Old message one",
        status: "archived",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "a2",
        name: "Evan",
        email: "evan@test.com",
        message: "Old message two",
        status: "archived",
        created_at: "2024-01-02T00:00:00Z",
      },
    ];
    mockListMessages.mockImplementation(async (_userId, status, limit = 200, offset = 0) => {
      // The All view keeps the standard fixture (chip counts); only the
      // Archived fetch switches to the two-row set.
      const list = status === "archived" ? archived : mockMessages;
      const page = list.slice(offset, offset + limit);
      return {
        success: true,
        data: {
          data: page,
          pagination: {
            total: list.length,
            limit,
            offset,
            hasMore: offset + page.length < list.length,
          },
        },
      };
    });

    renderAdmin(<MessagesManager />);
    await screen.findByText("Alice");

    await userEvent.click(screen.getByText(/Archived \(1\)/));
    await screen.findByText("Dana");
    expect(screen.getByText("Evan")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "Select message from Dana" }));
    await userEvent.click(screen.getByRole("button", { name: "Restore selected" }));

    await waitFor(() => {
      expect(mockBulkUnarchiveMessage).toHaveBeenCalledWith({ ids: ["a1"] });
    });
  });

  it("restores every archived message from the one-click action in the Archived tab", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    // The action only exists in the Archived view.
    expect(
      screen.queryByRole("button", { name: "Restore all archived" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByText(/Archived \(1\)/));
    await screen.findByText("Charlie");

    await userEvent.click(screen.getByRole("button", { name: "Restore all archived" }));

    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByText("Restore all archived"));

    await waitFor(() => {
      expect(mockRestoreAllArchived).toHaveBeenCalledTimes(1);
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

  it("requests the shared shortcuts modal via the header icon", async () => {
    // The modal itself is global (mounted in the shell by ShortcutsHelp) —
    // the header icon's job is just to request it through the shared event.
    const onOpen = vi.fn();
    window.addEventListener(SHORTCUTS_OPENED_EVENT, onOpen);

    renderAdmin(<MessagesManager />);
    await screen.findByText("Alice");

    await userEvent.click(screen.getByRole("button", { name: "Keyboard shortcuts" }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    window.removeEventListener(SHORTCUTS_OPENED_EVENT, onOpen);
  });

  it("shows empty state when no messages", async () => {
    mockListMessages.mockResolvedValue({
      success: true,
      data: { data: [], pagination: { total: 0, limit: 200, offset: 0, hasMore: false } },
    });

    renderAdmin(<MessagesManager />);

    expect(
      await screen.findByText("No messages yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Messages from your contact form will appear here"),
    ).toBeInTheDocument();
  });
});
