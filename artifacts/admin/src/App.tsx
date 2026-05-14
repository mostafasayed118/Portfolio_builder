import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminLayout from "@/components/AdminLayout";
import Overview from "@/pages/Overview";

const ThemeManager = lazy(() => import("@/pages/ThemeManager"));
const TypographyManager = lazy(() => import("@/pages/TypographyManager"));
const HeroManager = lazy(() => import("@/pages/HeroManager"));
const AboutManager = lazy(() => import("@/pages/AboutManager"));
const SkillsManager = lazy(() => import("@/pages/SkillsManager"));
const ProjectsManager = lazy(() => import("@/pages/ProjectsManager"));
const ExperienceManager = lazy(() => import("@/pages/ExperienceManager"));
const CertificationsManager = lazy(() => import("@/pages/CertificationsManager"));
const ContactManager = lazy(() => import("@/pages/ContactManager"));
const MessagesManager = lazy(() => import("@/pages/MessagesManager"));
const SeoManager = lazy(() => import("@/pages/SeoManager"));
const SectionOrderManager = lazy(() => import("@/pages/SectionOrderManager"));
const SiteSettingsManager = lazy(() => import("@/pages/SiteSettingsManager"));
const CvManager = lazy(() => import("@/pages/CvManager"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      Loading…
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AdminLayout>
            <Suspense fallback={<PageFallback />}>
              <Switch>
                <Route path="/" component={Overview} />
                <Route path="/theme" component={ThemeManager} />
                <Route path="/typography" component={TypographyManager} />
                <Route path="/hero" component={HeroManager} />
                <Route path="/about" component={AboutManager} />
                <Route path="/skills" component={SkillsManager} />
                <Route path="/projects" component={ProjectsManager} />
                <Route path="/experience" component={ExperienceManager} />
                <Route path="/certifications" component={CertificationsManager} />
                <Route path="/contact" component={ContactManager} />
                <Route path="/messages" component={MessagesManager} />
                <Route path="/seo" component={SeoManager} />
                <Route path="/sections" component={SectionOrderManager} />
                <Route path="/settings" component={SiteSettingsManager} />
                <Route path="/cv" component={CvManager} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </AdminLayout>
          <Toaster />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
