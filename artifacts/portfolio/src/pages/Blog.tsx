import { Fragment } from "react";
import { useLanguage } from "@/lib/language";
import { useLocation } from "wouter";
import { ArrowLeft, FileX } from "lucide-react";
import SEO from "@/components/SEO";
import { usePosts } from "@/hooks/use-portfolio-data";
import { BlogPostCard } from "@/features/blog";

export default function Blog() {
  const { isArabic } = useLanguage();
  const [, navigate] = useLocation();
  const { data: posts, isLoading } = usePosts();

  const heading = isArabic ? "المدونة" : "Blog";
  const subtitle = isArabic
    ? "أفكار ومقالات حول هندسة البيانات وتطوير البرمجيات."
    : "Ideas and articles on data engineering and software development.";

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

          <header className="space-y-3 mb-10">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">{heading}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">{subtitle}</p>
          </header>

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
          ) : (
            <Fragment>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post, index) => (
                  <BlogPostCard key={post.id ?? index} post={post} />
                ))}
              </div>
            </Fragment>
          )}
        </div>
      </main>
    </>
  );
}
