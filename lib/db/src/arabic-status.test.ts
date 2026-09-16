import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import { getArabicTranslationStatus } from "./arabic-status";

let supabase: ReturnType<typeof createMockSupabase>;
beforeEach(() => {
  supabase = createMockSupabase();
});

describe("getArabicTranslationStatus", () => {
  it("counts rows with non-null _ar columns per table via head queries", async () => {
    supabase.not
      .mockResolvedValueOnce({ data: null, count: 1, error: null }) // hero_content.name_ar
      .mockResolvedValueOnce({ data: null, count: 1, error: null }) // about_content.bio_ar
      .mockResolvedValueOnce({ data: null, count: 3, error: null }) // projects.title_ar
      .mockResolvedValueOnce({ data: null, count: 2, error: null }) // experience.title_ar
      .mockResolvedValueOnce({ data: null, count: 0, error: null }); // certifications.title_ar

    const result = await getArabicTranslationStatus(supabase as any);

    expect(supabase.from).toHaveBeenCalledWith("hero_content");
    expect(supabase.from).toHaveBeenCalledWith("about_content");
    expect(supabase.from).toHaveBeenCalledWith("projects");
    expect(supabase.from).toHaveBeenCalledWith("experience");
    expect(supabase.from).toHaveBeenCalledWith("certifications");
    expect(supabase.select).toHaveBeenCalledWith("name_ar", { count: "exact", head: true });
    expect(supabase.select).toHaveBeenCalledWith("bio_ar", { count: "exact", head: true });
    expect(supabase.select).toHaveBeenCalledWith("title_ar", { count: "exact", head: true });
    expect(supabase.not).toHaveBeenCalledWith("name_ar", "is", null);
    expect(supabase.not).toHaveBeenCalledWith("bio_ar", "is", null);
    expect(supabase.not).toHaveBeenCalledWith("title_ar", "is", null);
    expect(result).toEqual({
      hero: true,
      about: true,
      projects: { filled: 3 },
      experience: { filled: 2 },
      certifications: { filled: 0 },
    });
  });

  it("reports hero/about false and zero counts when no translations exist", async () => {
    supabase.not.mockResolvedValue({ data: null, count: 0, error: null });

    const result = await getArabicTranslationStatus(supabase as any);

    expect(result).toEqual({
      hero: false,
      about: false,
      projects: { filled: 0 },
      experience: { filled: 0 },
      certifications: { filled: 0 },
    });
  });

  it("treats a null count as zero", async () => {
    supabase.not.mockResolvedValue({ data: null, count: null, error: null });

    const result = await getArabicTranslationStatus(supabase as any);

    expect(result.projects.filled).toBe(0);
    expect(result.hero).toBe(false);
  });

  it("throws (with table context) when any query fails", async () => {
    supabase.not
      .mockResolvedValueOnce({ data: null, count: 1, error: null })
      .mockRejectedValueOnce(new Error("db down"));

    await expect(getArabicTranslationStatus(supabase as any)).rejects.toThrow("db down");
  });
});
