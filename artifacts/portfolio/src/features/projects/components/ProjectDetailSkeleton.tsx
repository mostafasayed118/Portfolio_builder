export default function ProjectDetailSkeleton() {
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
