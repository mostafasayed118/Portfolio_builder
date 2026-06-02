import { type ReactElement, type ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

const clerkStateRef = vi.hoisted(() => ({
  current: {
    isSignedIn: true as boolean,
    isLoaded: true as boolean,
    email: "admin@test.com" as string | undefined,
    userId: "user_test" as string | undefined,
    dbRole: "admin" as "admin" | "superadmin" | "visitor" | undefined,
  },
}));

export type ClerkState = typeof clerkStateRef.current;

export function setClerk(state: Partial<ClerkState>): void {
  clerkStateRef.current = { ...clerkStateRef.current, ...state };
}

export function resetClerk(): void {
  clerkStateRef.current = {
    isSignedIn: true,
    isLoaded: true,
    email: "admin@test.com",
    userId: "user_test",
    dbRole: "admin",
  };
}

function buildAuth() {
  const s = clerkStateRef.current;
  return {
    isSignedIn: s.isSignedIn,
    isLoaded: s.isLoaded,
    getToken: vi.fn(async () => "test-token"),
    signOut: vi.fn(async () => {}),
  };
}

function buildUser() {
  const s = clerkStateRef.current;
  if (!s.isSignedIn) {
    return { isLoaded: s.isLoaded, isSignedIn: false, user: null };
  }
  return {
    isLoaded: s.isLoaded,
    isSignedIn: true,
    user: {
      id: s.userId ?? "user_test",
      primaryEmailAddress: s.email ? { emailAddress: s.email } : null,
    },
  };
}

vi.mock("@clerk/clerk-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/clerk-react")>();
  return {
    ...actual,
    useAuth: vi.fn(() => buildAuth()),
    useUser: vi.fn(() => buildUser()),
  };
});

export function renderAdmin(
  ui: ReactElement,
  clerk: Partial<ClerkState> = {},
) {
  setClerk(clerk);
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

export function MockProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
