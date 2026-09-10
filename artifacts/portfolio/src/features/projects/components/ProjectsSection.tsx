import { useMemo, useState } from "react";
import { useLanguage } from "@/lib/language";
import { FolderKanban } from "lucide-react";
import { useProjects, mapDbProject, PROJECTS } from "@/features/projects/hooks/useProjects";
import ProjectCard from "@/features/projects/components/ProjectCard";
import { imageVariants } from "@/features/projects/components/ProjectGallery";
import { useProjectCovers } from "@/hooks/use-portfolio-data";
import { ProjectsSkeleton } from "@/features/projects/components/ProjectsSkeleton";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";

export default function ProjectsSection() {
  const [active, setActive] = useState("all");
  const { t } = useLanguage();
  const { data: projectsData, isLoading } = useProjects();
  const projectIds = useMemo(() => (projectsData ?? []).map((p) => p.id), [projectsData]);
  const { data: covers } = useProjectCovers(projectIds);

  if (isLoading) return <ProjectsSkeleton />;

  const allProjects = projectsData && projectsData.length > 0
    ? [...projectsData].filter((p) => p.is_published !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((p, i) => {
          const coverUrl = covers?.[p.id];
          return mapDbProject(p, i, coverUrl ? { url: coverUrl, variants: imageVariants(coverUrl) } : undefined);
        })
    : PROJECTS;

  const categories = [
    { key: "all", label: t.projects.all },
    ...Array.from(new Set(allProjects.map((p) => p.category))).map((cat) => ({
      key: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1),
    })),
  ];

  const filtered = active === "all" ? allProjects : allProjects.filter((p) => p.category === active);

  return (
    <section id="projects" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          label={t.projects.title}
          title={t.projects.title}
          description="Data pipelines, web scrapers, full-stack apps, and mobile experiences."
        />
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((cat) => (
            <button key={cat.key} onClick={() => setActive(cat.key)} aria-pressed={active === cat.key}
              data-testid={`filter-${cat.key}`}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${active === cat.key ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-float)]" : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"}`}>
              {cat.label}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={FolderKanban} title="No projects found"
            description={active !== "all" ? "Try a different category filter." : "No projects have been added yet."} compact />
        ) : (
          <div className="masonry-grid">
            {filtered.map((project) => <ProjectCard key={project.id} project={project} />)}
          </div>
        )}
      </div>
    </section>
  );
}
