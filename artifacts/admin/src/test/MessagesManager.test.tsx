import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderAdmin } from "./helpers";
import { MessagesManager } from "@/features/messages";

const {
  mockListMessages,
  mockMarkMessageRead,
  mockArchiveMessage,
  mockUnarchiveMessage,
  mockUnreadCount,
} = vi.hoisted(() => ({
  mockListMessages: vi.fn(),
  mockMarkMessageRead: vi.fn(),
  mockArchiveMessage: vi.fn(),
  mockUnarchiveMessage: vi.fn(),
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
      archive: mockArchiveMessage,
      unarchive: mockUnarchiveMessage,
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
    mockListMessages.mockResolvedValue({ success: true, data: mockMessages });
    mockMarkMessageRead.mockResolvedValue({ success: true });
    mockArchiveMessage.mockResolvedValue({ success: true });
    mockUnarchiveMessage.mockResolvedValue({ success: true });
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

  it("marks message as read on click", async () => {
    renderAdmin(<MessagesManager />);

    await screen.findByText("Alice");

    const markReadBtn = screen.getByRole("button", { name: /mark message from alice as read/i });
    await userEvent.click(markReadBtn);

    await waitFor(() => {
      expect(mockMarkMessageRead).toHaveBeenCalledWith("1");
    });
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
