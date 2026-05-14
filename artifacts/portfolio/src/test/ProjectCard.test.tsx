import { render, screen } from "@testing-library/react";
import ProjectCard from "@/components/ProjectCard";

describe("ProjectCard", () => {
  const project = {
    id: 1,
    title: "Test Project",
    description: "A test project description",
    techStack: ["React", "TypeScript"],
    category: "web",
    featured: true,
    githubUrl: "https://github.com/test/project",
    metrics: ["100+ stars", "50 forks"],
  };

  it("renders the project title", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("Test Project")).toBeInTheDocument();
  });

  it("renders the project description", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("A test project description")).toBeInTheDocument();
  });

  it("rendets the Featured badge when featured is true", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("Featured")).toBeInTheDocument();
  });

  it("renders the category badge", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("web")).toBeInTheDocument();
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
});
