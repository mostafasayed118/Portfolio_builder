import { useEntityQuery } from "@/lib/use-entity-query";
import { api } from "@/lib/api-client";
import type { Project } from "@workspace/supabase/types";

export function useProjectsList() {
  return useEntityQuery<Project[]>("projects", (uid) => api.projects.list(uid ?? undefined));
}
