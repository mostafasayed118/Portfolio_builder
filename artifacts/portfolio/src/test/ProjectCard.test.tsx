import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProjectCard from "@/components/ProjectCard";

const mockSetLocation = vi.fn();
vi.mock("wouter", () => ({
  useLocation: () => ["/", mockSetLocation],
}));

vi.mock("@/components/OptimizedImage", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

describe("ProjectCard", () => {
  const project = {
    id: 1,
    slug: "test-project",
    title: "Test Project",
    description: "A test project description",
    shortDescription: "A test project description",
    fullDescription: "Full description",
    techStack: ["React", "TypeScript"],
    category: "web",
    featured: true,
    githubUrl: "https://github.com/test/project",
    metrics: ["100+ stars", "50 forks"],
    images: [],
    completedAt: "2024-01",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the project title", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("Test Project")).toBeInTheDocument();
  });

  it("renders the project description", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("A test project description")).toBeInTheDocument();
  });

  it("renders the Featured badge when featured is true", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("Featured")).toBeInTheDocument();
  });

  it("renders category badge as 'Web App' for web projects", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("Web App")).toBeInTheDocument();
  });

  it("renders category badge as 'Cloud' for cloud projects", () => {
    render(<ProjectCard project={{ ...project, category: "cloud" }} />);
    expect(screen.getByText("Cloud")).toBeInTheDocument();
  });

  it("renders category badge as 'Mobile' for mobile projects", () => {
    render(<ProjectCard project={{ ...project, category: "mobile" }} />);
    expect(screen.getByText("Mobile")).toBeInTheDocument();
  });

  it("renders category badge as 'Data/Scraping' for scraping projects", () => {
    render(<ProjectCard project={{ ...project, category: "scraping" }} />);
    expect(screen.getByText("Data/Scraping")).toBeInTheDocument();
  });

  it("renders category badge as 'Data Eng' for data projects", () => {
    render(<ProjectCard project={{ ...project, category: "data" }} />);
    expect(screen.getByText("Data Eng")).toBeInTheDocument();
  });

  it("renders tech stack badges", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("renders metric badges", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("100+ stars")).toBeInTheDocument();
    expect(screen.getByText("50 forks")).toBeInTheDocument();
  });

  it("links to GitHub", () => {
    render(<ProjectCard project={project} />);
    const link = screen.getByLabelText("View on GitHub");
    expect(link).toHaveAttribute("href", "https://github.com/test/project");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not render Featured badge when not featured", () => {
    render(<ProjectCard project={{ ...project, featured: false }} />);
    expect(screen.queryByText("Featured")).not.toBeInTheDocument();
  });

  it("does not render metrics when empty", () => {
    render(<ProjectCard project={{ ...project, metrics: [] }} />);
    expect(screen.queryByText("100+ stars")).not.toBeInTheDocument();
  });

  it("navigates to project detail on click", () => {
    render(<ProjectCard project={project} />);
    const card = screen.getByRole("link", { name: /view details for test project/i });
    fireEvent.click(card);
    expect(mockSetLocation).toHaveBeenCalledWith("/projects/test-project");
  });

  it("has accessible aria-label", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByRole("link", { name: /view details for test project/i })).toBeInTheDocument();
  });

  it("does not navigate when clicking inside a link", () => {
    render(<ProjectCard project={project} />);
    const githubLink = screen.getByLabelText("View on GitHub");
    fireEvent.click(githubLink);
    expect(mockSetLocation).not.toHaveBeenCalled();
  });
});
