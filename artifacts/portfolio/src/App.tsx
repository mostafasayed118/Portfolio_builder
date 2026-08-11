import { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { ThemeProvider } from "@/lib/theme";
import { SupabaseProvider, isSupabaseConfigured } from "@/lib/supabase-provider";
import { BrandingProvider } from "@/lib/branding";
import { LanguageProvider } from "@/lib/language";
import { DynamicFavicon } from "@/components/DynamicFavicon";
import SupabaseThemeSync from "@/components/SupabaseThemeSync";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import SEO from "@/components/SEO";
import { Toaster } from "@workspace/ui";
import { ApiHealthCheck } from "@/components/ApiHealthCheck";
import { Loader2 } from "lucide-react";

const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>{children}</Suspense>;
}

function App() {
  return (
    <SupabaseProvider>
      <LanguageProvider>
        <ThemeProvider>
          <BrandingProvider>
            <SEO />
            <DynamicFavicon />
            {isSupabaseConfigured && <SupabaseThemeSync />}
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-lg focus:shadow-lg focus:outline-2 focus:outline-primary">
                Skip to main content
              </a>
              <Navbar />
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/projects/:slug">
                  {(params: { slug?: string }) => (
                    <SuspenseWrapper>
                      {params.slug ? <ProjectDetail slug={params.slug} /> : <NotFound />}
                    </SuspenseWrapper>
                  )}
                </Route>
                <Route component={NotFound} />
              </Switch>
              <Footer />
              <ApiHealthCheck />
              <Toaster />
            </WouterRouter>
          </BrandingProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SupabaseProvider>
  );
}

export default App;
