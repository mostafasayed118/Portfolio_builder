import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import HeroSection from "@/components/HeroSection";

const { mockGetSupabase, mockIsSupabaseConfigured, mockTrackEvent } = vi.hoisted(
  () => ({
    mockGetSupabase: vi.fn(),
    mockIsSupabaseConfigured: vi.fn(),
    mockTrackEvent: vi.fn(() => Promise.resolve()),
  }),
);

vi.mock("@/lib/supabase-provider", () => ({
  getSupabase: mockGetSupabase,
  isSupabaseConfigured: mockIsSupabaseConfigured,
  SupabaseProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/hooks/use-portfolio-data", () => ({
  useHeroContent: () => ({
    data: {
      heading: "Hi, I'm",
      name: "Mustafa Sayed",
      roles: ["Data Engineer"],
      description: "Test bio",
      github_url: "https://github.com/mustafa",
      linkedin_url: "https://linkedin.com/in/mustafa",
      twitter_url: null,
      email: "me@test.com",
      avatar_url: null,
      cv_url: "https://test.com/cv.pdf",
      available: true,
    },
    isLoading: false,
  }),
  useContactInfo: () => ({
    data: null,
    isLoading: false,
  }),
  useBranding: () => ({
    siteName: "Test",
    logoUrl: null,
  }),
  useSiteSettings: () => ({
    data: { twitter_handle: null },
    isLoading: false,
  }),
  useSeoSettings: () => ({
    data: { ga_tracking_id: null },
    isLoading: false,
  }),
  useThemeSettings: () => ({
    data: null,
    isLoading: false,
  }),
  useAboutContent: () => ({ data: null, isLoading: false }),
  useSkillsByCategory: () => ({ data: [], isLoading: false }),
  useProjects: () => ({ data: [], isLoading: false }),
  useExperience: () => ({ data: [], isLoading: false }),
  useCertifications: () => ({ data: [], isLoading: false }),
  useSectionSettings: () => ({ data: [], isLoading: false }),
  useTheme: () => ({ theme: "light" as const, setTheme: vi.fn(), toggle: vi.fn() }),
  useBranding2: () => ({ siteName: "Test", logoUrl: null }),
  useAnalytics: () => ({ trackPageView: vi.fn(), trackEvent: vi.fn() }),
}));

vi.mock("@workspace/db/contact-info", () => ({ getContactInfo: vi.fn() }));
vi.mock("@workspace/db/analytics", () => ({ trackEvent: mockTrackEvent }));
vi.mock("@/lib/logger", () => ({ logWarn: vi.fn(), logError: vi.fn() }));
vi.mock("@/lib/env", () => ({ getApiUrl: () => "http://test-api" }));
vi.mock("@/hooks/use-mouse-tilt", () => ({
  useMouseTilt: () => ({ ref: vi.fn(), onMouseMove: vi.fn(), onMouseEnter: vi.fn(), onMouseLeave: vi.fn(), style: {} }),
}));
vi.mock("@/hooks/use-typewriter", () => ({
  useTypewriter: (texts: string[]) => texts[0] ?? "",
}));
vi.mock("@/hooks/use-throttled-scroll", () => ({
  useThrottledScroll: vi.fn(),
}));
vi.mock("@workspace/db/analytics", () => ({ trackEvent: mockTrackEvent }));
vi.mock("@/data/portfolio", () => ({
  HERO: { available: true, cv_url: "https://test.com/cv.pdf", roles: ["Data Engineer"] },
  CONTACT: { location: "Cairo, Egypt" },
}));

function renderHero() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>
        <HeroSection />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("HeroSection — CV download flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSupabaseConfigured.mockReturnValue(false);
    mockGetSupabase.mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the CV download anchor with the `download` attribute pointing at /api/v1/cv", () => {
    renderHero();
    const link = screen.getByTestId("btn-download-cv");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("download");
    expect(link).toHaveAttribute("href", "http://test-api/api/v1/cv");
  });

  it("does not call trackEvent when Supabase is not configured", async () => {
    const user = userEvent.setup();
    renderHero();
    await user.click(screen.getByTestId("btn-download-cv"));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("calls trackEvent with 'cv_download' / 'hero' when Supabase is configured and the user clicks the CV button", async () => {
    mockIsSupabaseConfigured.mockReturnValue(true);
    mockGetSupabase.mockReturnValue({ from: vi.fn() });

    const user = userEvent.setup();
    renderHero();
    await user.click(screen.getByTestId("btn-download-cv"));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalled();
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.anything(),
      "cv_download",
      "/",
      expect.objectContaining({ source: "hero" }),
    );
  });

  it("shows the 'available for work' badge when hero.available is true", () => {
    renderHero();
    expect(screen.getByText(/available for work/i)).toBeInTheDocument();
  });

  it("renders the GitHub, LinkedIn, and Email social links with accessible labels", () => {
    renderHero();
    expect(screen.getByTestId("link-github")).toHaveAttribute(
      "aria-label",
      "GitHub",
    );
    expect(screen.getByTestId("link-linkedin")).toHaveAttribute(
      "aria-label",
      "LinkedIn",
    );
    expect(screen.getByTestId("link-email")).toHaveAttribute(
      "aria-label",
      "Email",
    );
  });

  it("renders 'Get In Touch' and 'View Projects' as anchor links (UX-007 regression)", () => {
    renderHero();
    const getInTouch = screen.getByTestId("btn-get-in-touch");
    const viewProjects = screen.getByTestId("btn-view-projects");
    expect(getInTouch.tagName).toBe("A");
    expect(getInTouch).toHaveAttribute("href", "#contact");
    expect(viewProjects.tagName).toBe("A");
    expect(viewProjects).toHaveAttribute("href", "#projects");
  });
});
