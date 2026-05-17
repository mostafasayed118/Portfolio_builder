import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});

class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "0px";
  readonly thresholds: ReadonlyArray<number> = [0];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

const mockHeroContent = {
  id: "test-hero-id",
  heading: "Hi, I'm",
  name: "Mustafa Sayed",
  roles: ["Data Engineer", "ETL Developer"],
  description: "Test description for hero section",
  github_url: "https://github.com/test",
  linkedin_url: "https://linkedin.com/in/test",
  twitter_url: null,
  email: "test@test.com",
  avatar_url: null,
  cv_url: "https://test.com/cv.pdf",
  stats: null,
  available: true,
  site_name: null,
  logo_url: null,
  favicon_url: null,
  tagline: null,
  cv_file_name: null,
  is_published: true,
  updated_at: "2024-01-01T00:00:00.000Z",
  created_at: "2024-01-01T00:00:00.000Z",
};

vi.mock("@workspace/supabase/client", () => ({
  isSupabaseConfigured: false,
  getSupabase: vi.fn(() => null),
  resetSupabase: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockHeroContent, error: null }),
            single: vi.fn(),
          })),
          maybeSingle: vi.fn(),
        })),
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({ maybeSingle: vi.fn() })),
          })),
          gte: vi.fn(() => ({
            order: vi.fn(() => ({ limit: vi.fn(() => ({})) })),
          })),
          single: vi.fn(),
        })),
        limit: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: mockHeroContent, error: null }) })),
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
