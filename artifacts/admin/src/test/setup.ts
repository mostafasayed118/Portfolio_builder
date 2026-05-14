import "@testing-library/jest-dom/vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(),
            single: vi.fn(),
          })),
          maybeSingle: vi.fn(),
        })),
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({ maybeSingle: vi.fn() })),
          })),
          single: vi.fn(),
        })),
        limit: vi.fn(() => ({ maybeSingle: vi.fn() })),
        single: vi.fn(),
      })),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
      update: vi.fn(() => ({ eq: vi.fn() })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        createSignedUrl: vi.fn(),
      })),
    },
  })),
}));

vi.mock("@clerk/clerk-react", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(() => ({ isSignedIn: true, isLoaded: true, getToken: vi.fn() })),
  useUser: vi.fn(() => ({ user: { primaryEmailAddress: { emailAddress: "admin@test.com" } } })),
  UserButton: () => null,
  SignIn: () => null,
}));
