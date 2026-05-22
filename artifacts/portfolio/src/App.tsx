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
import { Loader2 } from "lucide-react";

const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>{children}</Suspense>; {/* FIX: UX-009 */}
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
              <Toaster />
            </WouterRouter>
          </BrandingProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SupabaseProvider>
  );
}

export default App;
