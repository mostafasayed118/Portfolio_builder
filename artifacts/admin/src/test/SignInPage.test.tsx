import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SignInPage, POST_SIGN_IN_URL } from "@/features/auth";
import type { SignInProps } from "@clerk/clerk-react";

const { mockUseAuthUser, mockSignIn } = vi.hoisted(() => ({
  mockUseAuthUser: vi.fn(),
  mockSignIn: vi.fn(),
}));

vi.mock("@workspace/auth", () => ({
  useAuthUser: mockUseAuthUser,
}));

vi.mock("@clerk/clerk-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/clerk-react")>();
  return {
    ...actual,
    SignIn: (props: SignInProps) => {
      mockSignIn(props);
      return <div data-testid="clerk-sign-in">Clerk SignIn</div>;
    },
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

  it("hardcodes forceRedirectUrl to POST_SIGN_IN_URL on <SignIn /> — the spec forbids dynamic `?redirect_url=` passthrough", () => {
    mockUseAuthUser.mockReturnValue({ user: null, loading: false, isAdmin: false });
    renderSignIn();
    expect(mockSignIn).toHaveBeenCalled();
    const props = mockSignIn.mock.calls.at(-1)?.[0] as SignInProps;
    expect(props.forceRedirectUrl).toBe(POST_SIGN_IN_URL);
    expect(props.forceRedirectUrl).toBe("/overview");
  });

  it("POST_SIGN_IN_URL is the Admin dashboard route — never a passthrough of the previous URL", () => {
    // The constant must be a literal path string. If a developer
    // ever wires it to a dynamic value (e.g. `?redirect_url=`), this
    // test will fail.
    expect(POST_SIGN_IN_URL).toBe("/overview");
    expect(POST_SIGN_IN_URL).not.toMatch(/redirect/i);
    expect(POST_SIGN_IN_URL).not.toMatch(/=/);
  });
});
