import { useState } from "react";
import ProjectCard from "./ProjectCard";
import { PROJECTS } from "@/data/portfolio";
import { useReveal } from "@/hooks/use-reveal";
import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { listPublishedProjects } from "@workspace/db/projects";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "cloud", label: "Cloud / ETL" },
  { key: "scraping", label: "Web Scraping" },
  { key: "web", label: "Web Apps" },
  { key: "mobile", label: "Mobile" },
];

export default function ProjectsSection() {
  const [active, setActive] = useState("all");
  const { ref, revealed } = useReveal();
  const { data: projectsData } = useQuery({
    queryKey: ["publishedProjects"],
    queryFn: () => listPublishedProjects(getSupabase()),
    enabled: isSupabaseConfigured,
  });

  const allProjects =
    projectsData && projectsData.length > 0
      ? [...projectsData]
          .filter((p) => p.is_published !== false)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((p, i) => ({
            id: i + 1,
            title: p.title,
            description: p.description,
            techStack: p.tech_stack ?? [],
            category: p.category ?? "web",
            featured: p.featured ?? false,
            githubUrl: p.github_url ?? "",
            metrics: p.metrics ?? [],
          }))
      : PROJECTS;

  const filtered =
    active === "all"
      ? allProjects
      : allProjects.filter((p) => p.category === active);

  return (
    <section
      id="projects"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 px-6"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4">
            Projects
          </div>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
            What I've Built
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Data pipelines, web scrapers, full-stack apps, and mobile
            experiences.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActive(cat.key)}
              data-testid={`filter-${cat.key}`}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                active === cat.key
                  ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-float)]"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div
          className={`masonry-grid section-reveal ${revealed ? "revealed" : ""}`}
        >
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
