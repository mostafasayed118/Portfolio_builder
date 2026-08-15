import { useState } from "react";
import { ImageIcon } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";

export interface GalleryImage {
  id: string;
  url: string;
}

interface ProjectGalleryProps {
  images: GalleryImage[];
  title: string;
  /** Single cover image fallback (the project's `image_url` column). */
  fallbackUrl?: string | null;
}

/** Responsive variants backed by Supabase's on-the-fly image transforms. */
export function imageVariants(url: string) {
  return [
    { type: "thumbnail", url: `${url}?width=150&height=150&resize=cover` },
    { type: "small", url: `${url}?width=400&resize=contain` },
    { type: "medium", url: `${url}?width=800&resize=contain` },
    { type: "large", url: `${url}?width=1200&resize=contain` },
  ];
}

/**
 * Project image gallery: a large main image with a thumbnail strip. Falls
 * back to the project's single cover image (`image_url`) when no gallery
 * images are attached, and renders nothing when there is no image at all.
 */
export default function ProjectGallery({ images, title, fallbackUrl }: ProjectGalleryProps) {
  const [active, setActive] = useState(0);

  const sources = images.length > 0
    ? images.map((img) => ({ id: img.id, url: img.url }))
    : fallbackUrl
      ? [{ id: "fallback", url: fallbackUrl }]
      : [];

  if (sources.length === 0) return null;

  const activeImage = sources[Math.min(active, sources.length - 1)];

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl border border-border/60 p-2 overflow-hidden">
        <OptimizedImage
          key={activeImage.id}
          src={activeImage.url}
          alt={`${title} — screenshot ${Math.min(active, sources.length - 1) + 1}`}
          variants={imageVariants(activeImage.url)}
          className="aspect-video w-full rounded-xl"
          loading="eager"
          priority
        />
      </div>

      {sources.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={`${title} screenshots`}>
          {sources.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={idx === active}
              aria-label={`Show screenshot ${idx + 1}`}
              onClick={() => setActive(idx)}
              className={`relative shrink-0 w-24 sm:w-28 aspect-video rounded-lg overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${idx === active ? "border-primary" : "border-transparent opacity-60 hover:opacity-100 hover:border-border"}`}
            >
              <OptimizedImage
                src={img.url}
                alt=""
                variants={imageVariants(img.url)}
                className="w-full h-full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Small placeholder shown while gallery images load from Supabase. */
export function GalleryPlaceholder() {
  return (
    <div
      data-testid="gallery-placeholder"
      className="aspect-video w-full rounded-2xl bg-muted animate-pulse flex items-center justify-center"
    >
      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
    </div>
  );
}

/**
 * Empty state shown when a project has no gallery images and no cover
 * fallback yet. Keeps the detail page from collapsing to an invisible
 * gap — it renders a tasteful card prompting the owner to add images
 * from the admin Project Editor.
 */
export function GalleryEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <div
      data-testid="gallery-empty"
      role="img"
      aria-label={title}
      className="aspect-video w-full rounded-2xl border border-dashed border-border/70 bg-muted/30 flex flex-col items-center justify-center gap-2 text-center px-6"
    >
      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground max-w-md">{hint}</p>
    </div>
  );
}
