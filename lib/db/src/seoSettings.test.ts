import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import { getSeoSettings, upsertSeoSettings } from "./seoSettings";

describe("seoSettings", () => {
  let supabase: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    supabase = createMockSupabase();
  });

  describe("getSeoSettings", () => {
    it("returns data when found", async () => {
      const mockData = { id: "1", title: "My SEO Title", description: "Desc" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: mockData, error: null });
      const result = await getSeoSettings(supabase as any);
      expect(result).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith("seo_settings");
      expect(supabase.select).toHaveBeenCalledWith("*");
      expect(supabase.limit).toHaveBeenCalledWith(1);
    });

    it("returns null when no data", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await getSeoSettings(supabase as any);
      expect(result).toBeNull();
    });

    it("throws on supabase error", async () => {
      const error = new Error("DB error");
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error });
      await expect(getSeoSettings(supabase as any)).rejects.toThrow("DB error");
    });
  });

  describe("upsertSeoSettings", () => {
    it("updates existing record and returns its id", async () => {
      const existing = { id: "seo-1", title: "Old Title" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
      supabase.eq.mockResolvedValueOnce({ data: null, error: null });

      const result = await upsertSeoSettings(supabase as any, { title: "New Title" });
      expect(result).toBe("seo-1");
      expect(supabase.update).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith("id", "seo-1");
    });

    it("inserts with defaults when no existing record", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      supabase.single.mockResolvedValueOnce({ data: { id: "seo-new" }, error: null });

      const result = await upsertSeoSettings(supabase as any, {});
      expect(result).toBe("seo-new");
      expect(supabase.insert).toHaveBeenCalled();

      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.title).toBe("Mustafa Sayed — Data Engineer");
      expect(insertCall.twitter_card).toBe("summary_large_image");
      expect(insertCall.canonical_url).toBe("https://mustafasayed.replit.app");
    });

    it("throws on insert error", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const error = new Error("Insert failed");
      supabase.single.mockResolvedValueOnce({ data: null, error });

      await expect(upsertSeoSettings(supabase as any, {})).rejects.toThrow(
        "Insert failed",
      );
    });
  });
});
