import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SignInPage } from "@/lib/auth";

const { mockUseAuthUser } = vi.hoisted(() => ({ mockUseAuthUser: vi.fn() }));

vi.mock("@workspace/auth", () => ({
  useAuthUser: mockUseAuthUser,
}));

vi.mock("@clerk/clerk-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/clerk-react")>();
  return {
    ...actual,
    SignIn: () => <div data-testid="clerk-sign-in">Clerk SignIn</div>,
  };
});

function renderSignIn() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SignInPage />
    </QueryClientProvider>,
  );
}

describe("SignInPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Loading…' while Clerk is still loading the session", () => {
    mockUseAuthUser.mockReturnValue({ user: null, loading: true, isAdmin: false });
    renderSignIn();
    expect(screen.getByText(/loading…/i)).toBeInTheDocument();
    expect(screen.queryByTestId("clerk-sign-in")).not.toBeInTheDocument();
  });

  it("renders the Clerk SignIn component when not signed in", () => {
    mockUseAuthUser.mockReturnValue({ user: null, loading: false, isAdmin: false });
    renderSignIn();
    expect(screen.getByTestId("clerk-sign-in")).toBeInTheDocument();
  });

  it("redirects an already-signed-in admin — does NOT render the Clerk SignIn component", () => {
    mockUseAuthUser.mockReturnValue({
      user: { id: "u1", email: "admin@test.com", role: "admin" },
      loading: false,
      isAdmin: true,
    });
    renderSignIn();
    expect(screen.queryByTestId("clerk-sign-in")).not.toBeInTheDocument();
  });
});
