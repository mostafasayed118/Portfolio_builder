export function ProjectsSkeleton() {
  return (
    <section id="projects" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4">Projects</div>
          <div className="h-10 w-56 bg-muted rounded mx-auto mb-3 animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mx-auto mb-6 animate-pulse" />
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {["All", "Cloud", "Scraping", "Web", "Mobile"].map((cat) => <div key={cat} className="h-9 w-20 bg-muted rounded-full animate-pulse" />)}
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
