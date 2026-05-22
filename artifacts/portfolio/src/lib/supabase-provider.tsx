import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@workspace/supabase/client";
import type { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
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
