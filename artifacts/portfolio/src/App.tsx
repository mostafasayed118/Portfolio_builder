import { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/lib/theme";
import { SupabaseProvider, isSupabaseConfigured } from "@/lib/supabase-provider";
import { AuthProvider } from "@/lib/auth";
import { BrandingProvider } from "@/lib/branding";
import { LanguageProvider } from "@/lib/language";
import { DynamicFavicon } from "@/components/DynamicFavicon";
import SupabaseThemeSync from "@/components/SupabaseThemeSync";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import SEO from "@/components/SEO";
import AdminLayout from "@/components/admin/AdminLayout";
import ProtectedRoute from "@/components/admin/ProtectedRoute";

const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));
const Login = lazy(() => import("@/pages/admin/Login"));
const Dashboard = lazy(() => import("@/pages/admin/Dashboard"));
const MessagesViewer = lazy(() => import("@/pages/admin/MessagesViewer"));
const HeroEditor = lazy(() => import("@/pages/admin/HeroEditor"));
const AboutEditor = lazy(() => import("@/pages/admin/AboutEditor"));
const ProjectsManager = lazy(() => import("@/pages/admin/ProjectsManager"));
const SkillsManager = lazy(() => import("@/pages/admin/SkillsManager"));
const ExperienceManager = lazy(() => import("@/pages/admin/ExperienceManager"));
const CertificationsManager = lazy(() => import("@/pages/admin/CertificationsManager"));
const Settings = lazy(() => import("@/pages/admin/Settings"));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen" />}>{children}</Suspense>;
}

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/projects/:slug">
        {(params: { slug?: string }) => (
          <SuspenseWrapper>
            {params.slug ? <ProjectDetail slug={params.slug} /> : <NotFound />}
          </SuspenseWrapper>
        )}
      </Route>
      <Route path="/admin/login">
        <SuspenseWrapper><Login /></SuspenseWrapper>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminRouter() {
  return (
    <Switch>
      <Route path="/admin">
        <ProtectedRoute>
          <AdminLayout>
            <SuspenseWrapper><Dashboard /></SuspenseWrapper>
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/messages">
        <ProtectedRoute>
          <AdminLayout>
            <SuspenseWrapper><MessagesViewer /></SuspenseWrapper>
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/hero">
        <ProtectedRoute>
          <AdminLayout>
            <SuspenseWrapper><HeroEditor /></SuspenseWrapper>
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/about">
        <ProtectedRoute>
          <AdminLayout>
            <SuspenseWrapper><AboutEditor /></SuspenseWrapper>
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/projects">
        <ProtectedRoute>
          <AdminLayout>
            <SuspenseWrapper><ProjectsManager /></SuspenseWrapper>
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/skills">
        <ProtectedRoute>
          <AdminLayout>
            <SuspenseWrapper><SkillsManager /></SuspenseWrapper>
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/experience">
        <ProtectedRoute>
          <AdminLayout>
            <SuspenseWrapper><ExperienceManager /></SuspenseWrapper>
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/certifications">
        <ProtectedRoute>
          <AdminLayout>
            <SuspenseWrapper><CertificationsManager /></SuspenseWrapper>
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute>
          <AdminLayout>
            <SuspenseWrapper><Settings /></SuspenseWrapper>
          </AdminLayout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <LanguageProvider>
        <ThemeProvider>
          <BrandingProvider>
            <SEO />
            <DynamicFavicon />
            {isSupabaseConfigured && <SupabaseThemeSync />}
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Navbar />
              <PublicRouter />
              <AdminRouter />
              <Footer />
              <Toaster />
            </WouterRouter>
          </BrandingProvider>
        </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
}

export default App;
