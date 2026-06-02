import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute } from "@/lib/auth";

const { mockUseAuthUser } = vi.hoisted(() => ({ mockUseAuthUser: vi.fn() }));

vi.mock("@workspace/auth", () => ({
  useAuthUser: mockUseAuthUser,
}));

function renderProtected({ children = <div data-testid="protected-child">OK</div> } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ProtectedRoute>{children}</ProtectedRoute>
    </QueryClientProvider>,
  );
}

describe("ProtectedRoute — Clerk auth gating (the entire auth layer was untested)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Loading…' while Clerk is still loading the session", () => {
    mockUseAuthUser.mockReturnValue({ user: null, loading: true, isAdmin: false });
    renderProtected();
    expect(screen.getByText(/loading…/i)).toBeInTheDocument();
    expect(screen.queryByTestId("protected-child")).not.toBeInTheDocument();
  });

  it("renders <Redirect to='/sign-in'/> when the user is not signed in (wouter <Redirect> swaps to SignInPage)", () => {
    mockUseAuthUser.mockReturnValue({ user: null, loading: false, isAdmin: false });
    renderProtected();
    expect(screen.queryByTestId("protected-child")).not.toBeInTheDocument();
  });

  it("shows the 'Access Denied' page when signed in but email is NOT in VITE_ADMIN_EMAILS", () => {
    mockUseAuthUser.mockReturnValue({
      user: { id: "u1", email: "stranger@evil.com", role: "visitor" },
      loading: false,
      isAdmin: false,
    });
    renderProtected();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.getByText(/stranger@evil\.com/)).toBeInTheDocument();
  });

  it("renders the protected children when signed in with isAdmin=true", () => {
    mockUseAuthUser.mockReturnValue({
      user: { id: "u1", email: "admin@test.com", role: "admin" },
      loading: false,
      isAdmin: true,
    });
    renderProtected();
    expect(screen.getByTestId("protected-child")).toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  it("'superadmin' role is not enough on its own — isAdmin must also be true (current bridge contract)", () => {
    mockUseAuthUser.mockReturnValue({
      user: { id: "u1", email: "root@test.com", role: "superadmin" },
      loading: false,
      isAdmin: false,
    });
    renderProtected();
    expect(screen.queryByTestId("protected-child")).not.toBeInTheDocument();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
