export function SkillsSkeleton() {
  return (
    <section id="skills" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4">Skills</div>
          <div className="h-10 w-40 bg-muted rounded mx-auto mb-3 animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mx-auto mb-6 animate-pulse" />
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 w-20 bg-muted rounded-full animate-pulse" />)}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {Array.from({ length: 32 }).map((_, i) => <div key={i} className="h-8 w-24 bg-muted rounded-full animate-pulse" />)}
        </div>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
          {["bg-primary", "bg-accent", "bg-chart-3", "bg-muted-foreground"].map((dot, i) => (
            <div key={i} className="glass rounded-xl p-4 border text-center h-16 animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  );
}
