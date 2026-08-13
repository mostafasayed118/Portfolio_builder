export function HeroSkeleton() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row items-center gap-10 md:gap-16 pt-20 relative z-10">
        <div className="animate-fade-up flex-1 text-center md:text-left w-full md:w-auto">
          <div className="h-6 w-24 bg-muted rounded-full mb-6 animate-pulse" />
          <div className="h-10 w-64 bg-muted rounded mb-3 animate-pulse" />
          <div className="h-8 w-56 bg-muted rounded mb-4 animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded mb-6 animate-pulse" />
          <div className="h-4 w-full max-w-xs bg-muted rounded mb-2 animate-pulse" />
          <div className="h-4 w-3/4 max-w-xs bg-muted rounded mb-8 animate-pulse" />
          <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-8">
            <div className="h-10 w-32 bg-muted rounded-xl animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded-xl animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded-xl animate-pulse" />
          </div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
            <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
            <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
          </div>
        </div>
        <div className="relative shrink-0 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="relative h-40 w-40 sm:h-56 sm:w-56 md:h-72 md:w-72">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 blur-xl" />
            <div className="relative h-full w-full rounded-3xl glass border border-primary/20 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
              <div className="relative z-10 text-center p-6">
                <div className="font-display font-bold text-6xl md:text-7xl text-primary mb-1">MS</div>
                <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Data Engineer</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
