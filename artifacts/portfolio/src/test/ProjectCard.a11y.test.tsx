import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TestRouter } from "@/test/test-router";
import { ProjectCard } from "@/features/projects";

const { mockSetLocation } = vi.hoisted(() => ({
  mockSetLocation: vi.fn(),
}));

vi.mock("wouter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wouter")>();
  return {
    ...actual,
    useLocation: () => ["/", mockSetLocation],
  };
});

const baseProject = {
  id: "42",
  title: "Awesome Pipeline",
  slug: "awesome-pipeline",
  description: "A real-time ETL pipeline with Kafka and dbt",
  shortDescription: "A real-time ETL pipeline",
  category: "data",
  featured: true,
  techStack: ["Python", "Kafka", "dbt"],
  metrics: ["10k events/sec"],
  liveUrl: "https://example.com",
  githubUrl: "https://github.com/me/awesome-pipeline",
  imageId: undefined,
  imageVariants: undefined,
};

function renderCard(project: Partial<typeof baseProject> = {}) {
  return render(
    <TestRouter>
      <ProjectCard project={{ ...baseProject, ...project }} />
    </TestRouter>,
  );
}

describe("ProjectCard — accessibility regressions (UX-028, UX-037)", () => {
  beforeEach(() => {
    mockSetLocation.mockReset();
  });

  it("uses role='link', NOT role='button', for the card root (UX-028)", () => {
    renderCard();
    const card = screen.getByTestId("card-project-42");
    expect(card).toHaveAttribute("role", "link");
    expect(card).not.toHaveAttribute("role", "button");
  });

  it("has a descriptive aria-label including the project title", () => {
    renderCard();
    const card = screen.getByTestId("card-project-42");
    expect(card).toHaveAttribute("aria-label", "View details for Awesome Pipeline");
  });

  it("clicking the card calls setLocation with the project slug", () => {
    renderCard();
    fireEvent.click(screen.getByTestId("card-project-42"));
    expect(mockSetLocation).toHaveBeenCalledWith("/projects/awesome-pipeline");
  });

  it("Enter key on a focused card navigates to the project detail page", () => {
    renderCard();
    const card = screen.getByTestId("card-project-42");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(mockSetLocation).toHaveBeenCalledWith("/projects/awesome-pipeline");
  });

  it("Space key on a focused card navigates to the project detail page (WAI-ARIA button pattern)", () => {
    renderCard();
    const card = screen.getByTestId("card-project-42");
    fireEvent.keyDown(card, { key: " " });
    expect(mockSetLocation).toHaveBeenCalledWith("/projects/awesome-pipeline");
  });

  it("clicking the GitHub anchor inside the card does NOT trigger card-level navigation (event stopPropagation)", () => {
    renderCard();
    fireEvent.click(screen.getByTestId("link-github-project-42"));
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it("clicking the live-site anchor does NOT trigger card-level navigation", () => {
    renderCard();
    fireEvent.click(screen.getByLabelText("Live site"));
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it("falls back to 'project-{id}' slug when project.slug is missing", () => {
    renderCard({ slug: undefined });
    fireEvent.click(screen.getByTestId("card-project-42"));
    expect(mockSetLocation).toHaveBeenCalledWith("/projects/project-42");
  });

  it("renders the 'Featured' badge when project.featured is true", () => {
    renderCard({ featured: true });
    expect(screen.getByText("Featured")).toBeInTheDocument();
  });

  it("renders the Data Eng category badge for category='data'", () => {
    renderCard({ category: "data" });
    expect(screen.getByText("Data Eng")).toBeInTheDocument();
  });
});
