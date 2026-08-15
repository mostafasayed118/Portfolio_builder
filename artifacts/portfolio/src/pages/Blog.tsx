import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/language";
import { useLocation } from "wouter";
import { ArrowLeft, FileX, Search } from "lucide-react";
import SEO from "@/components/SEO";
import { usePosts } from "@/hooks/use-portfolio-data";
import { BlogPostCard } from "@/features/blog";

const POSTS_PER_PAGE = 6;

export default function Blog() {
  const { isArabic } = useLanguage();
  const [location, navigate] = useLocation();
  const { data: posts, isLoading } = usePosts();
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState(() => {
    const tag = new URLSearchParams(window.location.search).get("tag");
    return tag || "All";
  });
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);

  const heading = isArabic ? "المدونة" : "Blog";
  const subtitle = isArabic
    ? "أفكار ومقالات حول هندسة البيانات وتطوير البرمجيات."
    : "Ideas and articles on data engineering and software development.";

  const tags = useMemo(() => {
    const unique = new Set((posts ?? []).flatMap((post) => post.tags ?? []));
    return ["All", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (posts ?? []).filter((post) => {
      const matchesTag = activeTag === "All" || post.tags?.includes(activeTag);
      const searchable = `${post.title} ${post.excerpt ?? ""} ${(post.tags ?? []).join(" ")}`.toLowerCase();
      return matchesTag && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [activeTag, posts, query]);

  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [activeTag, query]);

  useEffect(() => {
    const tag = new URLSearchParams(location.split("?")[1] ?? "").get("tag");
    if (tag) setActiveTag(tag);
  }, [location]);

  return (
    <>
      <SEO
        title={heading}
        description={subtitle}
        url={`${import.meta.env.VITE_SITE_URL ?? "https://mustafasayed.replit.app"}/blog`}
        type="website"
      />
      <main className="min-h-screen pt-20 relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-accent/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </button>

          <header className="space-y-3 mb-8">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">{heading}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">{subtitle}</p>
          </header>

          {!isLoading && posts && posts.length > 0 && (
            <div className="space-y-4 mb-8" aria-label="Blog filters">
              <label className="relative block max-w-md">
                <span className="sr-only">Search blog posts</span>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search articles…"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(tag)}
                    aria-pressed={activeTag === tag}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTag === tag
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl border border-border/60 p-6 space-y-4 animate-pulse">
                  <div className="h-40 bg-muted rounded-xl" />
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-6 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-2/3 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="text-center py-24 space-y-4">
              <FileX className="h-16 w-16 text-muted-foreground mx-auto" />
              <h2 className="text-2xl font-semibold text-foreground">
                {isArabic ? "لا توجد مقالات بعد" : "No posts yet"}
              </h2>
              <p className="text-muted-foreground">
                {isArabic ? "تحقق لاحقاً للحصول على مقالات جديدة." : "Check back soon for new articles."}
              </p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-24 space-y-4">
              <Search className="h-12 w-12 text-muted-foreground mx-auto" />
              <h2 className="text-2xl font-semibold text-foreground">No matching articles</h2>
              <p className="text-muted-foreground">Try another search term or clear the active filter.</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.slice(0, visibleCount).map((post, index) => (
                  <BlogPostCard key={post.id ?? index} post={post} />
                ))}
              </div>
              {visibleCount < filteredPosts.length && (
                <div className="flex justify-center mt-10">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + POSTS_PER_PAGE)}
                    className="rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    Load more articles
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
