import { useState, useRef, useEffect } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  variants?: { type: string; url: string }[];
  priority?: boolean;
  fallback?: string;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  loading = "lazy",
  fetchPriority,
  variants,
  priority = false,
  fallback = "/placeholder.svg",
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(priority);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) { setInView(true); return; }
    if (loading !== "lazy") { setInView(true); return; }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.unobserve(el); } },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, priority]);

  const thumbnailUrl = variants?.find(v => v.type === "thumbnail")?.url;
  const smallUrl = variants?.find(v => v.type === "small")?.url ?? src;
  const mediumUrl = variants?.find(v => v.type === "medium")?.url ?? src;
  const largeUrl = variants?.find(v => v.type === "large")?.url ?? src;

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: width && height ? `${width}/${height}` : undefined }}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {!loaded && thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110 opacity-60"
          aria-hidden="true"
        />
      )}

      {inView && (
        <img
          src={mediumUrl}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
          onLoad={() => setLoaded(true)}
          onError={() => setImgSrc(fallback)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          srcSet={`${thumbnailUrl} 150w, ${smallUrl} 400w, ${mediumUrl} 800w, ${largeUrl} 1200w`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      )}
    </div>
  );
}
