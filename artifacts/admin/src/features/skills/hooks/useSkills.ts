import { useEntityQuery } from "@/lib/use-entity-query";
import { api } from "@/lib/api-client";
import type { Skill } from "@workspace/supabase/types";

export function useSkillsList() {
  return useEntityQuery<Skill[]>("skills", (uid) => api.skills.list(uid ?? undefined));
}
