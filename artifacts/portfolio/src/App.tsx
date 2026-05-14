import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/lib/theme";
import { SupabaseProvider, isSupabaseConfigured } from "@/lib/supabase-provider";
import SupabaseThemeSync from "@/components/SupabaseThemeSync";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <SupabaseProvider>
      <ThemeProvider>
        {isSupabaseConfigured && <SupabaseThemeSync />}
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Navbar />
          <Router />
          <Footer />
          <Toaster />
        </WouterRouter>
      </ThemeProvider>
    </SupabaseProvider>
  );
}

export default App;
