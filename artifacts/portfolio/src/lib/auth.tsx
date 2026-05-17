import { useEffect, useState, type ReactNode } from "react";
import { type AuthUser, AuthContextProvider, useAuthUser } from "@workspace/auth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { useLocation } from "wouter";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          role: "admin",
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseConfigured) {
      return { success: false, error: "Authentication is currently unavailable." };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      setLocation("/admin");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  };

  const signOut = async () => {
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setLocation("/admin/login");
  };

  return (
    <AuthContextProvider value={{ user, loading, signIn, signOut, isAdmin: !!user }}>
      {children}
    </AuthContextProvider>
  );
}

export { useAuthUser as useAuth };
