import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute, POST_SIGN_IN_URL, SIGN_IN_URL } from "@/features/auth";

const { mockUseAuthUser, mockUseAuth } = vi.hoisted(() => ({
  mockUseAuthUser: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock("@workspace/auth", () => ({
  useAuthUser: mockUseAuthUser,
}));

vi.mock("@clerk/clerk-react", () => ({
  useAuth: mockUseAuth,
  useUser: vi.fn(),
  SignIn: vi.fn(),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function renderProtected({ children = <div data-testid="protected-child">OK</div> } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ProtectedRoute>{children}</ProtectedRoute>
    </QueryClientProvider>,
  );
}

describe("ProtectedRoute — auth gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true, signOut: vi.fn(), getToken: vi.fn() });
  });

  it("shows 'Loading…' while Clerk is still loading", () => {
    mockUseAuthUser.mockReturnValue({ user: null, loading: true, isAdmin: false });
    renderProtected();
    expect(screen.getByText(/loading…/i)).toBeInTheDocument();
    expect(screen.queryByTestId("protected-child")).not.toBeInTheDocument();
  });

  it("redirects to /sign-in when Clerk says not signed in AND user is null", () => {
    mockUseAuthUser.mockReturnValue({ user: null, loading: false, isAdmin: false });
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false, signOut: vi.fn() });
    renderProtected();
    expect(screen.queryByTestId("protected-child")).not.toBeInTheDocument();
  });

  it("shows 'Session Expired' when Clerk signed in but backend user is null", () => {
    mockUseAuthUser.mockReturnValue({ user: null, loading: false, isAdmin: false });
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true, signOut: vi.fn() });
    renderProtected();
    expect(screen.getByText(/session expired/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByTestId("protected-child")).not.toBeInTheDocument();
  });

  it("shows 'Access Denied' when signed in but NOT admin (visitor role)", () => {
    mockUseAuthUser.mockReturnValue({
      user: { id: "u1", email: "stranger@evil.com", role: "visitor" },
      loading: false,
      isAdmin: false,
    });
    renderProtected();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.getByText(/stranger@evil\.com/)).toBeInTheDocument();
  });

  it("renders protected children when signed in with isAdmin=true", () => {
    mockUseAuthUser.mockReturnValue({
      user: { id: "u1", email: "admin@test.com", role: "admin" },
      loading: false,
      isAdmin: true,
    });
    renderProtected();
    expect(screen.getByTestId("protected-child")).toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  it("exports SIGN_IN_URL", () => {
    expect(SIGN_IN_URL).toBe("/sign-in");
  });

  it("exports POST_SIGN_IN_URL", () => {
    expect(POST_SIGN_IN_URL).toBe("/overview");
  });

  it("forces page reload on bfcache restore", () => {
    mockUseAuthUser.mockReturnValue({
      user: { id: "u1", email: "admin@test.com", role: "admin" },
      loading: false,
      isAdmin: true,
    });
    const reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
    renderProtected();
    const ev = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(ev, "persisted", { value: true });
    window.dispatchEvent(ev);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT reload on normal pageshow", () => {
    mockUseAuthUser.mockReturnValue({
      user: { id: "u1", email: "admin@test.com", role: "admin" },
      loading: false,
      isAdmin: true,
    });
    const reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
    renderProtected();
    const ev = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(ev, "persisted", { value: false });
    window.dispatchEvent(ev);
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
