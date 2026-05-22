import type { SupabaseClient } from "@supabase/supabase-js";
import type { Skill as DbSkill, InsertSkill } from "@workspace/supabase/types";

export type Skill = DbSkill;

export async function listSkills(
  supabase: SupabaseClient,
): Promise<Skill[]> {
  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listSkillsByCategory(
  supabase: SupabaseClient,
  category: string,
): Promise<Skill[]> {
  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .eq("category", category)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createSkill(
  supabase: SupabaseClient,
  args: {
    name: string;
    category: string;
    proficiency: number;
    icon?: string | null;
    sort_order: number;
    is_visible: boolean;
  },
): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("skills")
    .insert({
      name: args.name,
      category: args.category,
      proficiency: args.proficiency,
      icon: args.icon ?? null,
      sort_order: args.sort_order,
      is_visible: args.is_visible,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateSkill(
  supabase: SupabaseClient,
  id: string,
  args: Omit<Partial<InsertSkill>, 'id' | 'created_at'>,
): Promise<void> {
  const { error } = await supabase
    .from("skills")
    .update({ ...args, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSkill(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("skills")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
