import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UserSwitcher from "@/components/UserSwitcher";

const { mockUsersList } = vi.hoisted(
  () => ({
    mockUsersList: vi.fn(),
  }),
);

vi.mock("@/lib/api-client", () => ({
  api: {
    users: {
      list: mockUsersList,
    },
  },
  User: {},
}));

vi.mock("@workspace/auth", () => ({
  useAuthUser: () => ({ isSuperadmin: true }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const mockUsers = [
  { id: "u1", clerk_id: "c1", email: "user1@test.com", name: "User One", role: "user", created_at: "2024-01-01" },
  { id: "u2", clerk_id: "c2", email: "user2@test.com", name: "User Two", role: "user", created_at: "2024-01-01" },
];

describe("UserSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsersList.mockResolvedValue({ success: true, data: mockUsers });
  });

  it("renders select for superadmin", async () => {
    renderWithProviders(<UserSwitcher viewingUserId={null} onViewUserChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  it("calls onViewUserChange on selection", async () => {
    const onViewUserChange = vi.fn();
    renderWithProviders(<UserSwitcher viewingUserId={null} onViewUserChange={onViewUserChange} />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  it("shows Viewing as badge when viewing user selected", async () => {
    renderWithProviders(<UserSwitcher viewingUserId="u1" onViewUserChange={vi.fn()} />);

    await expect(screen.findByText(/Viewing as/)).resolves.toBeInTheDocument();
    expect(screen.getAllByText("User One").length).toBeGreaterThanOrEqual(1);
  });

  it("clears viewing user on badge close", async () => {
    const onViewUserChange = vi.fn();
    renderWithProviders(<UserSwitcher viewingUserId="u1" onViewUserChange={onViewUserChange} />);

    await screen.findByText(/Viewing as/);

    const clearButton = screen.getByRole("button", { name: "" });
    await userEvent.click(clearButton);

    expect(onViewUserChange).toHaveBeenCalledWith(null);
  });
});
