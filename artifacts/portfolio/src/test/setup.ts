import "@testing-library/jest-dom/vitest";
import { installBrowserMocks, makeSupabaseCreateClientMock } from "@workspace/test-utils";

installBrowserMocks();

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
  createClient: makeSupabaseCreateClientMock({
    maybeSingleData: mockHeroContent,
    includeGte: true,
  }),
}));
