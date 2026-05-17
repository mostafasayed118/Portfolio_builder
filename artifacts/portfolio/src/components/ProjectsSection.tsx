import { useState } from "react";
import { useLanguage } from "@/lib/language";
import { FolderKanban } from "lucide-react";
import ProjectCard from "./ProjectCard";
import EmptyState from "./EmptyState";
import { PROJECTS } from "@/data/portfolio";
import { useReveal } from "@/hooks/use-reveal";
import { useProjects } from "@/hooks/use-portfolio-data";

function ProjectsSkeleton() {
  return (
    <section id="projects" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4">
            Projects
          </div>
          <div className="h-10 w-56 bg-muted rounded mx-auto mb-3 animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mx-auto mb-6 animate-pulse" />
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {["All", "Cloud", "Scraping", "Web", "Mobile"].map((cat) => (
              <div key={cat} className="h-9 w-20 bg-muted rounded-full animate-pulse" />
            ))}
          </div>
        </div>
        <div className="masonry-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass rounded-xl border p-4 animate-pulse">
              <div className="h-48 bg-muted rounded mb-4" />
              <div className="h-5 w-3/4 bg-muted rounded mb-2" />
              <div className="h-3 w-1/2 bg-muted rounded mb-3" />
              <div className="flex gap-2">
                <div className="h-5 w-16 bg-muted rounded" />
                <div className="h-5 w-16 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ProjectsSection() {
  const [active, setActive] = useState("all");
  const { ref, revealed } = useReveal();
  const { t } = useLanguage();
  const { data: projectsData, isLoading } = useProjects();

  if (isLoading) {
    return <ProjectsSkeleton />;
  }

  const projectIds = projectsData?.map(p => p.id) ?? [];

  const allProjects =
    projectsData && projectsData.length > 0
      ? [...projectsData]
          .filter((p) => p.is_published !== false)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((p, i) => ({
            id: i + 1,
            slug: p.title.toLowerCase().replace(/\s+/g, "-"),
            title: p.title,
            shortDescription: p.description,
            fullDescription: p.description,
            techStack: p.tech_stack ?? [],
            category: p.category ?? "web",
            featured: p.featured ?? false,
            githubUrl: p.github_url ?? "",
            liveUrl: p.live_url ?? undefined,
            metrics: p.metrics ?? [],
            images: [],
            completedAt: new Date().getFullYear().toString(),
          }))
      : PROJECTS;

  const categories = [
    { key: "all", label: t.projects.all },
    ...Array.from(new Set(allProjects.map((p) => p.category))).map((cat) => ({
      key: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
    })),
  ];

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
            {t.projects.title}
          </div>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
            {t.projects.title}
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Data pipelines, web scrapers, full-stack apps, and mobile
            experiences.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((cat) => (
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

        {filtered.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects found"
            description={active !== "all" ? "Try a different category filter." : "No projects have been added yet."}
            compact
          />
        ) : (
          <div
            className={`masonry-grid section-reveal ${revealed ? "revealed" : ""}`}
          >
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}