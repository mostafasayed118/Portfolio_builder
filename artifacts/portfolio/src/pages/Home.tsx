import { lazy, Suspense, useEffect } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { trackEvent } from "@workspace/db/analytics";
import { useToast } from "@workspace/ui";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import SEO from "@/components/SEO";
import HeroSection from "@/components/HeroSection";
import BackToTop from "@/components/BackToTop";
import { SyncDebug } from "@/components/SyncDebug";

const AboutSection = lazy(() => import("@/components/AboutSection"));
const SkillsSection = lazy(() => import("@/components/SkillsSection"));
const ProjectsSection = lazy(() => import("@/components/ProjectsSection"));
const ExperienceSection = lazy(() => import("@/components/ExperienceSection"));
const CertificationsSection = lazy(() => import("@/components/CertificationsSection"));
const ContactSection = lazy(() => import("@/components/ContactSection"));

function SectionSkeleton() {
  return (
    <div className="py-24 px-6">
      <div className="max-w-5xl mx-auto animate-pulse">
        <div className="h-4 w-24 bg-muted rounded-full mx-auto mb-4" />
        <div className="h-8 w-48 bg-muted rounded-lg mx-auto mb-3" />
        <div className="h-4 w-72 bg-muted rounded mx-auto mb-12" />
        <div className="grid md:grid-cols-2 gap-8">
          <div className="h-64 bg-muted/50 rounded-xl" />
          <div className="h-64 bg-muted/50 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { toast } = useToast();
  useRealtimeSync();

  useEffect(() => {
    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      if (supabase) {
        trackEvent(supabase, "page_view", "/").catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    const hasVisited = sessionStorage.getItem("visited");
    if (!hasVisited) {
      sessionStorage.setItem("visited", "true");
      const timer = setTimeout(() => {
        toast({
          title: "Welcome to my portfolio!",
          description: "Explore my projects, skills, and experience. Feel free to reach out!",
          duration: 5000,
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      <SEO />
      <main>
      <Suspense fallback={<SectionSkeleton />}>
        <HeroSection />
      </Suspense> {/* FIX: UX-009 */}
      <Suspense fallback={<SectionSkeleton />}>
        <AboutSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <SkillsSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <ProjectsSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <ExperienceSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <CertificationsSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <ContactSection />
      </Suspense>
      <BackToTop />
      <SyncDebug />
    </main>
    </>
  );
}
