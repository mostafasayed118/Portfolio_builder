import { useQueryClient } from "@tanstack/react-query";
import { useHeroContent, useProjects, useSkills } from "@/hooks/use-portfolio-data";
import { isSupabaseConfigured } from "@/lib/supabase-provider";
import { useState } from "react";

export function SyncDebug() {
  const queryClient = useQueryClient();
  const { data: hero, dataUpdatedAt: heroAt, error: heroErr, isError: heroIsErr } = useHeroContent();
  const { data: projects, dataUpdatedAt: projAt, error: projErr, isError: projIsErr } = useProjects();
  const { data: skills, dataUpdatedAt: skillsAt, error: skillsErr, isError: skillsIsErr } = useSkills();
  const [expanded, setExpanded] = useState(false);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] bg-black/95 text-white text-xs p-3 rounded-lg max-w-sm font-mono shadow-2xl border border-white/10">
      <button onClick={() => setExpanded(!expanded)} className="font-bold mb-1 flex items-center gap-2 w-full text-left">
        <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? "bg-green-400" : "bg-red-400"}`} />
        Sync Debug {expanded ? "▲" : "▼"}
      </button>
      {expanded && (
        <div className="space-y-1 mt-2 border-t border-white/10 pt-2">
          <p>Supabase: {isSupabaseConfigured ? "configured" : "NOT CONFIGURED"}</p>
          <hr className="border-white/10" />
          <p className={heroIsErr ? "text-red-400" : ""}>
            Hero: {hero ? `OK (${hero.name})` : heroIsErr ? `ERR: ${heroErr?.message}` : "null → static fallback"}
            {heroAt > 0 && ` [${new Date(heroAt).toLocaleTimeString()}]`}
          </p>
          <p className={projIsErr ? "text-red-400" : ""}>
            Projects: {projects ? `${projects.length} items` : projIsErr ? `ERR: ${projErr?.message}` : "null → static fallback"}
            {projAt > 0 && ` [${new Date(projAt).toLocaleTimeString()}]`}
          </p>
          <p className={skillsIsErr ? "text-red-400" : ""}>
            Skills: {skills ? `${skills.length} items` : skillsIsErr ? `ERR: ${skillsErr?.message}` : "null → static fallback"}
            {skillsAt > 0 && ` [${new Date(skillsAt).toLocaleTimeString()}]`}
          </p>
          <hr className="border-white/10" />
          <button
            onClick={() => queryClient.invalidateQueries()}
            className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-xs w-full font-sans font-medium"
          >
            Force Refetch All
          </button>
        </div>
      )}
    </div>
  );
}
