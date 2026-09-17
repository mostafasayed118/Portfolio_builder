import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/pages/Home";
import ProjectDetail from "@/pages/ProjectDetail";
import BlogPost from "@/pages/BlogPost";

const { trackEvent, resolveDefaultPortfolioId } = vi.hoisted(() => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
  resolveDefaultPortfolioId: vi.fn(),
}));
vi.mock("@workspace/db/analytics", () => ({ trackEvent }));
vi.mock("@/lib/analytics-portfolio", () => ({ resolveDefaultPortfolioId }));
vi.mock("@/lib/supabase-provider", () => ({ getSupabase: () => ({}), isSupabaseConfigured: true }));
vi.mock("@workspace/ui", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useRealtimeSync", () => ({ useRealtimeSync: vi.fn() }));
vi.mock("@/lib/language", () => ({
  useLanguage: () => ({ t: { common: {}, projects: {} }, isArabic: false }),
}));
vi.mock("wouter", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useLocation: () => ["/", vi.fn()],
}));
vi.mock("@/components/SEO", () => ({ default: () => null, generateProjectSchema: () => null }));
vi.mock("@/features/hero", () => ({ HeroSection: () => null }));
vi.mock("@/features/about", () => ({ AboutSection: () => null }));
vi.mock("@/features/skills", () => ({ SkillsSection: () => null }));
vi.mock("@/features/projects", () => ({
  ProjectsSection: () => null, ProjectCard: () => null, ProjectGallery: () => null,
  GalleryEmpty: () => null, GalleryPlaceholder: () => null, ProjectDetailSkeleton: () => null,
  mapDbProjectDetail: () => ({ slug: "project-one", title: "Project One", techStack: [], category: "test" }),
}));
vi.mock("@/features/contact", () => ({ ContactSection: () => null }));
vi.mock("@/components/ExperienceSection", () => ({ default: () => null }));
vi.mock("@/components/CertificationsSection", () => ({ default: () => null }));
vi.mock("@/components/BackToTop", () => ({ default: () => null }));
vi.mock("@/components/SyncDebug", () => ({ SyncDebug: () => null }));
vi.mock("@/hooks/usePortfolioData", () => ({
  useProjectBySlug: () => ({ data: { id: "project-id" }, isLoading: false }),
  useProjectImages: () => ({ data: [], isLoading: false }),
  usePostBySlug: () => ({ data: { slug: "post-one", title: "Post One", content: "Text", tags: [] }, isLoading: false }),
  usePosts: () => ({ data: [] }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  sessionStorage.setItem("visited", "true");
  resolveDefaultPortfolioId.mockResolvedValue("published-portfolio");
});

const cases = [
  { name: "home", page: <Home />, type: "page_view", path: "/", metadata: undefined },
  { name: "project", page: <ProjectDetail slug="project-one" />, type: "project_view", path: "/projects/project-one", metadata: { project_slug: "project-one", title: "Project One" } },
  { name: "blog", page: <BlogPost slug="post-one" />, type: "page_view", path: "/blog/post-one", metadata: { content_type: "blog_post" } },
];

describe("page analytics portfolio resolution", () => {
  it.each(cases)("stamps $name events with the resolved portfolio", async ({ page, type, path, metadata }) => {
    render(page);
    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith(expect.anything(), type, path, metadata, "published-portfolio"));
  });

  it.each(cases)("skips $name events when resolution is unavailable", async ({ page }) => {
    resolveDefaultPortfolioId.mockResolvedValue(null);
    render(page);
    await waitFor(() => expect(resolveDefaultPortfolioId).toHaveBeenCalled());
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
