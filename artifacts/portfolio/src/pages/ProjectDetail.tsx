import { useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/language";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ExternalLink, Github, Calendar, Sparkles } from "lucide-react";
import { PROJECTS } from "@/data/portfolio";
import SEO, { generateProjectSchema } from "@/components/SEO";
import ProjectCard from "@/components/ProjectCard";
import { useProjectBySlug } from "@/hooks/use-portfolio-data";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { trackEvent } from "@workspace/db/analytics";

function ProjectDetailSkeleton() {
  return (
    <main className="min-h-screen pt-20">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="h-5 w-32 bg-muted rounded mb-8 animate-pulse" />
        <article className="space-y-8">
          <header className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
              <div className="h-6 w-24 bg-muted rounded-full animate-pulse" />
              <div className="h-6 w-28 bg-muted rounded-full animate-pulse" />
            </div>
            <div className="h-10 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-5 w-1/2 bg-muted rounded animate-pulse" />
            <div className="flex gap-3">
              <div className="h-10 w-28 bg-muted rounded-lg animate-pulse" />
              <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
            </div>
          </header>
          <div className="aspect-video bg-muted rounded-2xl animate-pulse" />
          <div className="glass rounded-2xl border border-border/60 p-6 md:p-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`h-4 bg-muted rounded animate-pulse ${i === 5 ? "w-3/4" : "w-full"}`} />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-2xl border border-border/60 p-6 space-y-3">
              <div className="h-5 w-28 bg-muted rounded animate-pulse" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded animate-pulse" />
              ))}
            </div>
            <div className="glass rounded-2xl border border-border/60 p-6 space-y-3">
              <div className="h-5 w-20 bg-muted rounded animate-pulse" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl border border-border/60 p-6">
            <div className="h-5 w-24 bg-muted rounded mb-4 animate-pulse" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-7 w-20 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}

interface ProjectDetailProps {
  slug: string;
}

export default function ProjectDetail({ slug }: ProjectDetailProps) {
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { data: dbProject, isLoading } = useProjectBySlug(slug);

  const project = useMemo(() => {
    if (dbProject) {
      return {
        id: 0,
        slug: dbProject.slug ?? slug,
        title: dbProject.title,
        shortDescription: dbProject.description,
        fullDescription: dbProject.full_description ?? dbProject.description,
        description: dbProject.description,
        challenges: dbProject.challenges ?? null,
        outcome: dbProject.outcome ?? null,
        techStack: dbProject.tech_stack ?? [],
        category: dbProject.category ?? "web",
        featured: dbProject.featured ?? false,
        githubUrl: dbProject.github_url ?? "",
        liveUrl: dbProject.live_url ?? undefined,
        metrics: dbProject.metrics ?? [],
        images: [],
        completedAt: dbProject.completed_at ?? dbProject.created_at?.slice(0, 4) ?? "",
      };
    }
    return PROJECTS.find((p) => p.slug === slug) ?? null;
  }, [dbProject, slug]);

  useEffect(() => {
    if (!isLoading && !project) {
      navigate("/not-found", { replace: true });
    }
  }, [isLoading, project, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (project?.slug && isSupabaseConfigured) {
      trackEvent(getSupabase(), "project_view", `/projects/${project.slug}`, {
        project_slug: project.slug,
        title: project.title,
      });
    }
  }, [project?.slug]);

  if (isLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (!project) {
    return null;
  }

  const relatedProjects = PROJECTS.filter(
    (p) => p.category === project.category && p.slug !== project.slug
  ).slice(0, 3);

  return (
    <>
      <SEO
        title={project.title}
        description={project.shortDescription}
        url={`${import.meta.env.VITE_SITE_URL ?? "https://mustafasayed.replit.app"}/projects/${project.slug}`}
        type="article"
        publishedTime={project.completedAt}
        tags={project.techStack}
        schemas={[generateProjectSchema(slug)].filter(Boolean) as Record<string, unknown>[]}
      />
      <main className="min-h-screen pt-20 relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-accent/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
          <Link
            href="/#projects"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.projects.backToProjects}
          </Link>

          <article className="space-y-8">
            <header className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                {project.featured && (
                  <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-semibold border border-primary/20">
                    <Sparkles className="h-3 w-3" />
                    {t.projects.viewProject}
                  </span>
                )}
                <span className="text-xs text-muted-foreground capitalize bg-muted px-3 py-1 rounded-full">
                  {project.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {project.completedAt}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                {project.title}
              </h1>

              <p className="text-lg text-muted-foreground max-w-2xl">
                {project.shortDescription}
              </p>

              <div className="flex flex-wrap gap-3">
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t.projects.viewLive}
                  </a>
                )}
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground font-semibold text-sm hover:border-primary/40 hover:text-primary transition-all"
                >
                  <Github className="h-4 w-4" />
                  {t.projects.viewCode}
                </a>
              </div>
            </header>

            <div className="glass rounded-2xl border border-border/60 p-6 md:p-8">
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">About This Project</h2>
              <div className="prose prose-sm md:prose prose-muted max-w-none">
                {(project.fullDescription ?? project.description ?? "").split("\n\n").map((paragraph, idx) => (
                  <p key={idx} className="text-muted-foreground leading-relaxed mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {(project.challenges || project.outcome) && (
              <div className="grid md:grid-cols-2 gap-6">
                {project.challenges && (
                  <div className="glass rounded-2xl border border-border/60 p-6">
                    <h3 className="text-base font-display font-semibold text-foreground mb-3">{t.projects.challenges}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{project.challenges}</p>
                  </div>
                )}
                {project.outcome && (
                  <div className="glass rounded-2xl border border-border/60 p-6">
                    <h3 className="text-base font-display font-semibold text-foreground mb-3">{t.projects.outcome}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{project.outcome}</p>
                  </div>
                )}
              </div>
            )}

            <div className="glass rounded-2xl border border-border/60 p-6">
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">{t.projects.techStack}</h2>
              <div className="flex flex-wrap gap-2">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="text-sm text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border border-border/60"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {project.metrics && project.metrics.length > 0 && (
              <div className="glass rounded-2xl border border-border/60 p-6">
                <h2 className="text-lg font-display font-semibold text-foreground mb-4">Key Metrics</h2>
                <div className="flex flex-wrap gap-3">
                  {project.metrics.map((metric) => (
                    <span
                      key={metric}
                      className="text-sm text-accent font-medium bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20"
                    >
                      {metric}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          {relatedProjects.length > 0 && (
            <section className="mt-16">
              <h2 className="text-2xl font-display font-bold text-foreground mb-8">{t.projects.relatedProjects}</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedProjects.map((p) => (
                  <Link key={p.slug} href={`/projects/${p.slug}`}>
                    <div className="cursor-pointer">
                      <ProjectCard project={p} />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}