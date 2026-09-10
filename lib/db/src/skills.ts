import type { SupabaseClient } from "@supabase/supabase-js";
import type { Skill as DbSkill, InsertSkill } from "@workspace/supabase/types";
import { queryOrThrow } from "./query";

export type Skill = DbSkill;

const TABLE = "skills" as const;

const SKILL_LIST_COLUMNS =
  "id,name,category,proficiency,icon,sort_order,is_visible";

export type SkillListItem = Pick<
  Skill,
  | "id"
  | "name"
  | "category"
  | "proficiency"
  | "icon"
  | "sort_order"
  | "is_visible"
>;

export async function listSkills(
  supabase: SupabaseClient,
): Promise<SkillListItem[]> {
  return queryOrThrow<SkillListItem[]>(
    supabase.from(TABLE).select(SKILL_LIST_COLUMNS).is("deleted_at", null).order("sort_order", { ascending: true }),
    { table: TABLE, operation: "listSkills" },
  );
}

export async function listSkillsByCategory(
  supabase: SupabaseClient,
  category: string,
): Promise<SkillListItem[]> {
  return queryOrThrow<SkillListItem[]>(
    supabase.from(TABLE).select(SKILL_LIST_COLUMNS).eq("category", category).is("deleted_at", null).order("sort_order", { ascending: true }),
    { table: TABLE, operation: "listSkillsByCategory" },
  );
}

export async function createSkill(
  supabase: SupabaseClient,
  args: { name: string; category: string; proficiency: number; icon?: string | null; sort_order: number; is_visible: boolean },
): Promise<string> {
  const now = new Date().toISOString();
  const data = await queryOrThrow<{ id: string }>(
    supabase.from(TABLE).insert({
      name: args.name, category: args.category, proficiency: args.proficiency,
      icon: args.icon ?? null, sort_order: args.sort_order, is_visible: args.is_visible,
      created_at: now, updated_at: now,
    }).select("id").single(),
    { table: TABLE, operation: "createSkill" },
  );
  return data.id;
}

export async function updateSkill(
  supabase: SupabaseClient,
  id: string,
  args: Omit<Partial<InsertSkill>, 'id' | 'created_at'>,
): Promise<void> {
  await queryOrThrow(
    supabase.from(TABLE).update({ ...args, updated_at: new Date().toISOString() }).eq("id", id),
    { table: TABLE, operation: "updateSkill" },
  );
}

export async function deleteSkill(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  await queryOrThrow(
    supabase.from(TABLE).update({ deleted_at: new Date().toISOString() }).eq("id", id),
    { table: TABLE, operation: "deleteSkill" },
  );
}
