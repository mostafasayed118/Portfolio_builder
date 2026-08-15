import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/language";
import { Link } from "wouter";
import { ArrowLeft, Calendar, Check, Clock, FileX, Share2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import RemarkGfm from "remark-gfm";
import SEO from "@/components/SEO";
import { usePostBySlug, usePosts } from "@/hooks/use-portfolio-data";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { trackEvent } from "@workspace/db/analytics";
import { logWarn } from "@/lib/logger";
import { BlogPostCard, formatPostDate, getReadingTime } from "@/features/blog";

function BlogPostSkeleton() {
  return (
    <main className="min-h-screen pt-20">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="h-5 w-28 bg-muted rounded mb-8 animate-pulse" />
        <div className="space-y-4">
          <div className="h-10 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-5 w-1/3 bg-muted rounded animate-pulse" />
          <div className="h-56 bg-muted rounded-2xl animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`h-4 bg-muted rounded animate-pulse ${i === 6 ? "w-2/3" : "w-full"}`} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

interface BlogPostPageProps {
  slug: string;
}

export default function BlogPostPage({ slug }: BlogPostPageProps) {
  const { isArabic } = useLanguage();
  const { data: post, isLoading } = usePostBySlug(slug);
  const { data: posts } = usePosts();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (post?.slug && isSupabaseConfigured) {
      const sb = getSupabase();
      if (sb) {
        trackEvent(sb, "page_view", `/blog/${post.slug}`, { content_type: "blog_post" })
          .catch((err) => logWarn("trackEvent failed", err));
      }
    }
  }, [post?.slug]);

  const relatedPosts = useMemo(() => {
    if (!post || !posts) return [];
    const currentTags = new Set(post.tags ?? []);
    return posts
      .filter((candidate) => candidate.slug !== post.slug)
      .map((candidate) => ({
        candidate,
        score: (candidate.tags ?? []).filter((tag) => currentTags.has(tag)).length,
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ candidate }) => candidate);
  }, [post, posts]);

  const sharePost = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: post?.title ?? "Blog post", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Sharing can be cancelled by the user; no error state is needed.
    }
  };

  if (isLoading) {
    return <BlogPostSkeleton />;
  }

  if (!post) {
    return (
      <main className="min-h-screen pt-20">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center space-y-4">
          <FileX className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold">{isArabic ? "المقال غير موجود" : "Post Not Found"}</h1>
          <p className="text-muted-foreground">
            {isArabic ? "المقال الذي تبحث عنه غير موجود أو تمت إزالته." : "The post you're looking for doesn't exist or has been removed."}
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
        </div>
      </main>
    );
  }

  const baseUrl = import.meta.env.VITE_SITE_URL ?? "https://mustafa-sayed-portfolio.vercel.app";
  const articleUrl = `${baseUrl}/blog/${post.slug}`;

  return (
    <>
      <SEO
        title={post.title}
        description={post.excerpt ?? post.title}
        url={articleUrl}
        type="article"
        publishedTime={post.published_at ?? undefined}
        image={post.cover_image_url ?? undefined}
        tags={post.tags}
        schemas={[{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt ?? post.title,
          datePublished: post.published_at ?? post.created_at,
          dateModified: post.created_at,
          mainEntityOfPage: articleUrl,
          image: post.cover_image_url ? [post.cover_image_url] : undefined,
          author: { "@type": "Person", name: "Mustafa Sayed" },
        }]}
      />
      <main className="min-h-screen pt-20 relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-accent/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-3xl mx-auto px-6 py-12 relative z-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          <article>
            <header className="space-y-4 mb-8">
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={post.published_at ?? undefined}>{formatPostDate(post.published_at)}</time>
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {getReadingTime(post.content)} min read
                </span>
                <button
                  type="button"
                  onClick={sharePost}
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                  aria-label="Share this article"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  {copied ? "Link copied" : "Share"}
                </button>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="text-lg text-muted-foreground max-w-2xl">{post.excerpt}</p>
              )}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/blog?tag=${encodeURIComponent(tag)}`}
                      className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/60 hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
            </header>

            {post.cover_image_url && (
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="w-full h-64 md:h-80 object-cover rounded-2xl border border-border/60 mb-8"
              />
            )}

            <div className="prose prose-sm md:prose prose-muted max-w-none prose-headings:font-display prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-primary prose-strong:text-foreground prose-li:text-muted-foreground">
              <ReactMarkdown remarkPlugins={[RemarkGfm]}>{post.content}</ReactMarkdown>
            </div>
          </article>

          {relatedPosts.length > 0 && (
            <section className="mt-16 pt-10 border-t border-border" aria-labelledby="related-posts-heading">
              <h2 id="related-posts-heading" className="text-2xl font-display font-bold text-foreground mb-6">Related articles</h2>
              <div className="grid md:grid-cols-3 gap-5">
                {relatedPosts.map((related) => <BlogPostCard key={related.id} post={related} />)}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
