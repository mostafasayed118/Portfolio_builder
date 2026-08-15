import { lazy, Suspense, useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toaster, TooltipProvider } from "@workspace/ui";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ViewingUserProvider } from "@/lib/viewing-user-context";
import { ProtectedRoute, SignInPage } from "@/features/auth";
import { ApiHealthCheck } from "@/components/ApiHealthCheck";
import { abortAllRequests, beginRequestGroup } from "@/lib/api-client";

const Overview = lazy(() => import("@/pages/Overview"));
const ThemeManager = lazy(() => import("@/features/settings").then(m => ({ default: m.ThemeManager })));
const TypographyManager = lazy(() => import("@/features/settings").then(m => ({ default: m.TypographyManager })));
const HeroEditor = lazy(() => import("@/features/hero-content").then(m => ({ default: m.HeroEditor })));
const AboutEditor = lazy(() => import("@/features/about-content").then(m => ({ default: m.AboutEditor })));
const SkillsManager = lazy(() => import("@/features/skills").then(m => ({ default: m.SkillsManager })));
const ProjectsManager = lazy(() => import("@/features/projects").then(m => ({ default: m.ProjectsManager })));
const ExperienceManager = lazy(() => import("@/features/experience").then(m => ({ default: m.ExperienceManager })));
const CertificationsManager = lazy(() => import("@/features/certifications").then(m => ({ default: m.CertificationsManager })));
const PostsManager = lazy(() => import("@/features/posts").then(m => ({ default: m.PostsManager })));
const ContactManager = lazy(() => import("@/features/contact-info").then(m => ({ default: m.ContactManager })));
const MessagesManager = lazy(() => import("@/features/messages").then(m => ({ default: m.MessagesManager })));
const SeoManager = lazy(() => import("@/features/settings").then(m => ({ default: m.SeoManager })));
const SectionOrderManager = lazy(() => import("@/features/settings").then(m => ({ default: m.SectionOrderManager })));
const SiteSettingsManager = lazy(() => import("@/features/settings").then(m => ({ default: m.SiteSettingsManager })));
const CvManager = lazy(() => import("@/features/cv").then(m => ({ default: m.CvManager })));
const AuditLog = lazy(() => import("@/features/audit").then(m => ({ default: m.default })));
const Analytics = lazy(() => import("@/features/analytics").then(m => ({ default: m.default })));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      Loading…
    </div>
  );
}

function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: (failureCount, error) => {
          // Never retry 429 rate-limit responses — retrying amplifies the
          // pressure on the very limiter that just rejected us. Surface the
          // error to the user and let the manual "Try Again" button decide.
          if (error instanceof Error && /too many (requests|messages|admin)/i.test(error.message)) {
            return false;
          }
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
    },
  }));
  const [location] = useLocation();
  // Abort any in-flight admin mutations on every route change so the
  // user never sees stale state from a request that completed after
  // navigation.
  useEffect(() => {
    beginRequestGroup();
    return () => abortAllRequests();
  }, [location]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ViewingUserProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Switch>
                <Route path="/sign-in">
                  <SignInPage />
                </Route>

                <Route>
                  <ProtectedRoute>
                    <AdminLayout>
                      <Switch>
                        <Route path="/" component={() => <Redirect to="/overview" />} />
                        <Route path="/overview" component={Overview} />
                        <Route path="/hero"><Suspense fallback={<PageFallback />}><HeroEditor /></Suspense></Route>
                        <Route path="/about"><Suspense fallback={<PageFallback />}><AboutEditor /></Suspense></Route>
                        <Route path="/projects"><Suspense fallback={<PageFallback />}><ProjectsManager /></Suspense></Route>
                        <Route path="/skills"><Suspense fallback={<PageFallback />}><SkillsManager /></Suspense></Route>
                        <Route path="/experience"><Suspense fallback={<PageFallback />}><ExperienceManager /></Suspense></Route>
                        <Route path="/certifications"><Suspense fallback={<PageFallback />}><CertificationsManager /></Suspense></Route>
                        <Route path="/posts"><Suspense fallback={<PageFallback />}><PostsManager /></Suspense></Route>
                        <Route path="/messages"><Suspense fallback={<PageFallback />}><MessagesManager /></Suspense></Route>
                        <Route path="/contact"><Suspense fallback={<PageFallback />}><ContactManager /></Suspense></Route>
                        <Route path="/cv"><Suspense fallback={<PageFallback />}><CvManager /></Suspense></Route>
                        <Route path="/seo"><Suspense fallback={<PageFallback />}><SeoManager /></Suspense></Route>
                        <Route path="/typography"><Suspense fallback={<PageFallback />}><TypographyManager /></Suspense></Route>
                        <Route path="/sections"><Suspense fallback={<PageFallback />}><SectionOrderManager /></Suspense></Route>
                        <Route path="/theme"><Suspense fallback={<PageFallback />}><ThemeManager /></Suspense></Route>
                        <Route path="/settings"><Suspense fallback={<PageFallback />}><SiteSettingsManager /></Suspense></Route>
                        <Route path="/analytics"><Suspense fallback={<PageFallback />}><Analytics /></Suspense></Route>
                        <Route path="/audit"><Suspense fallback={<PageFallback />}><AuditLog /></Suspense></Route>
                        <Route component={NotFound} />
                      </Switch>
                    </AdminLayout>
                  </ProtectedRoute>
                </Route>
              </Switch>
              <ApiHealthCheck />
              <Toaster />
            </WouterRouter>
          </ViewingUserProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
