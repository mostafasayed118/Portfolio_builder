import { GraduationCap, Languages } from "lucide-react";
import { SKILLS, STATS } from "@/data/portfolio";

export function AboutSkeleton() {
  return (
    <section id="about" className="py-24 px-6 bg-muted/20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-block h-6 w-16 bg-muted rounded-full mb-4 animate-pulse" />
          <div className="h-10 w-48 bg-muted rounded mx-auto mb-3 animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mx-auto animate-pulse" />
        </div>
        <div className="grid md:grid-cols-2 gap-8 md:gap-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
            </div>
            <div className="glass rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-5 w-5 text-primary" />
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-4 w-48 bg-muted rounded animate-pulse" /><div className="h-3 w-32 bg-muted rounded animate-pulse" />
              <div className="flex items-center gap-2 mt-1.5">
                <div className="h-5 w-24 bg-muted rounded-full animate-pulse" /><div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Languages className="h-5 w-5 text-primary" /><div className="h-4 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i}><div className="h-4 w-20 bg-muted rounded mb-1 animate-pulse" /><div className="h-1.5 w-full bg-muted rounded-full animate-pulse" /></div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-5 w-24 bg-muted rounded mb-4 animate-pulse" />
            <div className="space-y-4">
              {SKILLS.map((_, i) => <div key={i} className="h-6 w-48 bg-muted rounded animate-pulse" />)}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {STATS.map((_, i) => <div key={i} className="glass rounded-xl p-4 border h-16 animate-pulse" />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
