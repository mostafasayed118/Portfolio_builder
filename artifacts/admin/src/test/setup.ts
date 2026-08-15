import "@testing-library/jest-dom/vitest";
import { installBrowserMocks, makeSupabaseCreateClientMock } from "@workspace/test-utils";

installBrowserMocks();

vi.mock("@supabase/supabase-js", () => ({
  createClient: makeSupabaseCreateClientMock(),
}));

vi.mock("@workspace/auth", () => ({
  AuthContextProvider: ({ value, children }: { value: unknown; children: React.ReactNode }) =>
    children,
  useAuthUser: vi.fn(() => ({
    user: { id: "test-id", email: "admin@test.com", role: "admin" as const },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    isAdmin: true,
  })),
}));

vi.mock("@clerk/clerk-react", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(() => ({ isSignedIn: true, isLoaded: true, getToken: vi.fn() })),
  useUser: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    user: { id: "user_test", primaryEmailAddress: { emailAddress: "admin@test.com" } },
  })),
  SignIn: () => null,
}));
