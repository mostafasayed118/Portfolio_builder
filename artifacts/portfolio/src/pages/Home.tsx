import { lazy, Suspense } from "react";
import HeroSection from "@/components/HeroSection";

const AboutSection = lazy(() => import("@/components/AboutSection"));
const SkillsSection = lazy(() => import("@/components/SkillsSection"));
const ProjectsSection = lazy(() => import("@/components/ProjectsSection"));
const ExperienceSection = lazy(() => import("@/components/ExperienceSection"));
const CertificationsSection = lazy(() => import("@/components/CertificationsSection"));
const ContactSection = lazy(() => import("@/components/ContactSection"));

export default function Home() {
  return (
    <main>
      <HeroSection />
      <Suspense fallback={<div className="h-64" />}>
        <AboutSection />
      </Suspense>
      <Suspense fallback={<div className="h-64" />}>
        <SkillsSection />
      </Suspense>
      <Suspense fallback={<div className="h-64" />}>
        <ProjectsSection />
      </Suspense>
      <Suspense fallback={<div className="h-64" />}>
        <ExperienceSection />
      </Suspense>
      <Suspense fallback={<div className="h-64" />}>
        <CertificationsSection />
      </Suspense>
      <Suspense fallback={<div className="h-64" />}>
        <ContactSection />
      </Suspense>
    </main>
  );
}
