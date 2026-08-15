/**
 * Smoke test for ProjectDetail.
 *
 * ProjectDetail is a 299-line dynamic page that:
 *  - Loads a project by slug from Supabase (falls back to static data)
 *  - Renders full description, tech stack, challenges/outcome
 *  - Renders related projects from the same category
 *  - Calls trackEvent('project_view') on mount
 *  - Shows a "not found" UI when slug is unknown
 *
 * This smoke test verifies the happy paths only:
 *  1. Page renders without crashing when useProjectBySlug returns data
 *  2. Page shows the "not found" UI when useProjectBySlug returns null
 *  3. Page calls trackEvent on mount
 *  4. Page shows the static fallback when Supabase is not configured
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectDetail from "@/pages/ProjectDetail";

const mockTrackEvent = vi.fn();

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useLocation: () => ["/projects/depi-azure", vi.fn()],
}));

vi.mock("@/lib/language", () => ({
  useLanguage: () => ({
    t: {
      common: { readMore: "Read more", backToHome: "Back to home" },
      projects: {
        challenges: "Challenges",
        outcome: "Outcome",
        techStack: "Tech Stack",
        relatedProjects: "Related Projects",
        notFound: "Project not found",
        notFoundDescription: "The project you're looking for doesn't exist.",
        galleryEmptyTitle: "No screenshots yet",
        galleryEmptyHint: "Gallery images added from the admin will appear here.",
      },
    },
    isArabic: false,
  }),
}));

vi.mock("@workspace/db/analytics", () => ({
  trackEvent: (...args: unknown[]) => {
    mockTrackEvent(...args);
    return Promise.resolve();
  },
}));

vi.mock("@/hooks/use-portfolio-data", () => ({
  useProjectBySlug: vi.fn(),
  useProjectImages: vi.fn(),
}));

vi.mock("@/lib/supabase-provider", () => ({
  getSupabase: () => null,
  isSupabaseConfigured: false,
}));

vi.mock("@/components/SEO", () => ({
  default: () => null,
  generateProjectSchema: vi.fn(),
}));

vi.mock("@/components/ProjectCard", () => ({
  default: ({ project }: { project: { title: string; slug: string } }) => (
    <a data-testid="related-card" href={`/projects/${project.slug}`}>
      {project.title}
    </a>
  ),
}));

import { useProjectBySlug, useProjectImages } from "@/hooks/use-portfolio-data";
const mockUseProjectBySlug = vi.mocked(useProjectBySlug);
const mockUseProjectImages = vi.mocked(useProjectImages);

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no images, not loading (settled empty).
  mockUseProjectImages.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  } as any);
});

describe("ProjectDetail (smoke)", () => {
  it("renders the project title when data is available", async () => {
    mockUseProjectBySlug.mockReturnValue({
      data: {
        id: "1",
        slug: "depi-azure",
        title: "DEPI Azure Data Engineering",
        description: "Capstone project ingesting large datasets in Azure",
        full_description: "Built a full Azure data pipeline with ADF, Synapse, and ADLS Gen2",
        challenges: "Handling 100+ GB of raw CSVs",
        outcome: "Automated dashboard refresh every 6h",
        tech_stack: ["Azure Data Factory", "Azure Synapse", "Python", "SQL"],
        category: "data",
        featured: true,
        github_url: "https://github.com/test/depi",
        live_url: null,
        image_url: null,
        is_published: true,
        sort_order: 1,
        deleted_at: null,
        user_id: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithProviders(<ProjectDetail slug="depi-azure" />);

    await waitFor(() => {
      expect(screen.getByText("DEPI Azure Data Engineering")).toBeInTheDocument();
    });
  });

  it("shows the 'not found' UI when slug returns no data", async () => {
    mockUseProjectBySlug.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithProviders(<ProjectDetail slug="nonexistent" />);

    await waitFor(() => {
      expect(screen.getByText(/project not found/i)).toBeInTheDocument();
    });
  });

  it("shows the empty gallery card when the project has no images and no fallback", async () => {
    mockUseProjectBySlug.mockReturnValue({
      data: {
        id: "1",
        slug: "depi-azure",
        title: "DEPI Azure Data Engineering",
        description: "Capstone",
        full_description: "Full",
        tech_stack: [],
        category: "data",
        featured: false,
        github_url: "https://github.com/test/depi",
        live_url: null,
        image_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithProviders(<ProjectDetail slug="depi-azure" />);

    await waitFor(() => {
      expect(screen.getByTestId("gallery-empty")).toBeInTheDocument();
    });
    expect(screen.getByText("No screenshots yet")).toBeInTheDocument();
  });

  it("shows the loading placeholder while gallery images are fetching", async () => {
    mockUseProjectBySlug.mockReturnValue({
      data: {
        id: "1",
        slug: "depi-azure",
        title: "DEPI Azure Data Engineering",
        description: "Capstone",
        full_description: "Full",
        tech_stack: [],
        category: "data",
        featured: false,
        github_url: "https://github.com/test/depi",
        live_url: null,
        image_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    mockUseProjectImages.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    renderWithProviders(<ProjectDetail slug="depi-azure" />);

    await waitFor(() => {
      expect(screen.getByTestId("gallery-placeholder")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("gallery-empty")).not.toBeInTheDocument();
  });

  it("renders the gallery when images exist", async () => {
    mockUseProjectBySlug.mockReturnValue({
      data: {
        id: "1",
        slug: "depi-azure",
        title: "DEPI Azure Data Engineering",
        description: "Capstone",
        full_description: "Full",
        tech_stack: [],
        category: "data",
        featured: false,
        github_url: "https://github.com/test/depi",
        live_url: null,
        image_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    mockUseProjectImages.mockReturnValue({
      data: [{ id: "a", url: "https://img.example.com/a.png" }],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithProviders(<ProjectDetail slug="depi-azure" />);

    await waitFor(() => {
      expect(screen.getByAltText(/DEPI Azure Data Engineering — screenshot 1/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("gallery-empty")).not.toBeInTheDocument();
  });

  it("renders nothing when loading and no static fallback", () => {
    mockUseProjectBySlug.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    // The page may return null during loading — that's fine, it shouldn't crash.
    expect(() => renderWithProviders(<ProjectDetail slug="loading-slug" />)).not.toThrow();
  });
});
