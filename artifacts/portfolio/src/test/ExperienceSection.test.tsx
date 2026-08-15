import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { mockEmptyState, mockSectionLabel, mockUseReveal, renderWithProviders } from "./helpers";

vi.mock("@/hooks/use-portfolio-data", () => ({
  useExperience: vi.fn(),
}));

vi.mock("@/hooks/use-reveal", () => mockUseReveal());

vi.mock("@/components/TimelineItem", () => ({
  default: ({ title, company }: { title: string; company: string }) => (
    <div data-testid="timeline-item">
      {title} — {company}
    </div>
  ),
}));

vi.mock("@/components/SectionLabel", () => mockSectionLabel());

vi.mock("@/components/EmptyState", () => mockEmptyState());

import ExperienceSection from "@/components/ExperienceSection";
import { useExperience } from "@/hooks/use-portfolio-data";

describe("ExperienceSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows skeleton while loading", () => {
    vi.mocked(useExperience).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { container } = renderWithProviders(<ExperienceSection />);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders experience items when data is loaded", () => {
    vi.mocked(useExperience).mockReturnValue({
      data: [
        {
          id: "1",
          title: "Data Engineer",
          company: "Tech Corp",
          location: "Cairo",
          period: "2022 - Present",
          type: "full-time",
          description: "Built pipelines",
          technologies: ["Python", "Spark"],
          sort_order: 0,
        },
        {
          id: "2",
          title: "Intern",
          company: "StartupXYZ",
          location: "Remote",
          period: "2021 - 2022",
          type: "internship",
          description: "Learned stuff",
          technologies: ["SQL"],
          sort_order: 1,
        },
      ],
      isLoading: false,
    } as any);

    renderWithProviders(<ExperienceSection />);
    expect(screen.getAllByTestId("timeline-item")).toHaveLength(2);
    expect(screen.getByText(/Data Engineer/)).toBeInTheDocument();
    expect(screen.getByText(/Intern/)).toBeInTheDocument();
  });

  it("renders fallback EXPERIENCE data when hook returns empty array", () => {
    vi.mocked(useExperience).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderWithProviders(<ExperienceSection />);
    // Component falls back to static EXPERIENCE data when hook returns empty
    const items = screen.getAllByTestId("timeline-item");
    expect(items.length).toBeGreaterThan(0);
  });
});
