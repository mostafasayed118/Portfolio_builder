import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MessagesManager from "@/pages/MessagesManager";

const {
  mockListMessages,
  mockMarkMessageRead,
  mockDeleteMessage,
} = vi.hoisted(() => ({
  mockListMessages: vi.fn(),
  mockMarkMessageRead: vi.fn(),
  mockDeleteMessage: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(() => ({})),
  isSupabaseConfigured: true,
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    messages: {
      list: mockListMessages,
      unreadCount: vi.fn(),
      markRead: mockMarkMessageRead,
      delete: mockDeleteMessage,
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

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
    mockDeleteMessage.mockResolvedValue({ success: true });
  });

  it("renders messages table", async () => {
    renderWithProviders(<MessagesManager />);

    expect(await screen.findByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.getByText("3 total messages from the contact form.")).toBeInTheDocument();
  });

  it("filters by All/Unread/Read tabs", async () => {
    renderWithProviders(<MessagesManager />);

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
    renderWithProviders(<MessagesManager />);

    await screen.findByText("Alice");

    const markReadBtn = screen.getAllByTitle("Mark as read")[0];
    await userEvent.click(markReadBtn);

    await waitFor(() => {
      expect(mockMarkMessageRead).toHaveBeenCalledWith("1");
    });
  });

  it("bulk delete with confirmation dialog", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = renderWithProviders(<MessagesManager />);

    await screen.findByText("Alice");

    const deleteBtn = container.querySelector(".text-destructive") as HTMLElement;
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith("Delete message?");
      expect(mockDeleteMessage).toHaveBeenCalledWith("1");
    });

    confirmSpy.mockRestore();
  });

  it("shows empty state when no messages", async () => {
    mockListMessages.mockResolvedValue({ success: true, data: [] });

    renderWithProviders(<MessagesManager />);

    expect(
      await screen.findByText(
        /No messages yet. They'll appear here when someone submits the contact form./,
      ),
    ).toBeInTheDocument();
  });
});
