import { Link } from "wouter";
import { ArrowRight, Calendar } from "lucide-react";
import type { BlogPost } from "../types";
import { formatPostDate } from "../types";

export default function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group glass rounded-2xl border border-border/60 p-6 flex flex-col gap-3 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-float)] hover:-translate-y-0.5"
    >
      {post.cover_image_url && (
        <div className="relative h-44 overflow-hidden rounded-xl mb-1">
          <img
            src={post.cover_image_url}
            alt={post.title}
            loading="lazy"
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <time dateTime={post.published_at ?? undefined}>{formatPostDate(post.published_at)}</time>
      </div>
      <h3 className="font-display font-semibold text-lg text-foreground leading-snug group-hover:text-primary transition-colors">
        {post.title}
      </h3>
      {post.excerpt && (
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{post.excerpt}</p>
      )}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-auto pt-2">
          {post.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/60"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <span className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-2">
        Read
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
