import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import Overview from "@/pages/Overview";
import { Toaster, TooltipProvider } from "@workspace/ui";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ViewingUserProvider } from "@/lib/viewing-user-context";
import { ProtectedRoute, SignInPage } from "@/lib/auth";

const ThemeManager = lazy(() => import("@/pages/ThemeManager"));
const TypographyManager = lazy(() => import("@/pages/TypographyManager"));
const HeroEditor = lazy(() => import("@/pages/HeroEditor"));
const AboutEditor = lazy(() => import("@/pages/AboutEditor"));
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      Loading…
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ViewingUserProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Suspense fallback={<PageFallback />}>
                <Switch>
                  {/* Public route — sign-in (no auth required) */}
                  <Route path="/sign-in">
                    <SignInPage />
                  </Route>

                  {/* All other routes require auth */}
                  <Route>
                    <ProtectedRoute>
                      <AdminLayout>
                        <Switch>
                          <Route path="/" component={() => <Redirect to="/overview" />} />
                          <Route path="/overview" component={Overview} />
                          <Route path="/hero" component={HeroEditor} />
                          <Route path="/about" component={AboutEditor} />
                          <Route path="/projects" component={ProjectsManager} />
                          <Route path="/skills" component={SkillsManager} />
                          <Route path="/experience" component={ExperienceManager} />
                          <Route path="/certifications" component={CertificationsManager} />
                          <Route path="/messages" component={MessagesManager} />
                          <Route path="/contact" component={ContactManager} />
                          <Route path="/cv" component={CvManager} />
                          <Route path="/seo" component={SeoManager} />
                          <Route path="/typography" component={TypographyManager} />
                          <Route path="/sections" component={SectionOrderManager} />
                          <Route path="/theme" component={ThemeManager} />
                          <Route path="/settings" component={SiteSettingsManager} />
                          <Route component={NotFound} />
                        </Switch>
                      </AdminLayout>
                    </ProtectedRoute>
                  </Route>
                </Switch>
              </Suspense>
              <Toaster />
            </WouterRouter>
          </ViewingUserProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
