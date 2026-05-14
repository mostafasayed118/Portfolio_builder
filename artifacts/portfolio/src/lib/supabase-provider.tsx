import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@workspace/supabase/client";
import type { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export { isSupabaseConfigured, getSupabase };

export function SupabaseProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
