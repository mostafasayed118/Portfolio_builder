import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import {
  getHeroContent,
  upsertHeroContent,
  seedDefaultHeroContent,
} from "./heroContent";

describe("heroContent", () => {
  let supabase: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    supabase = createMockSupabase();
  });

  describe("getHeroContent", () => {
    it("returns data when found", async () => {
      const mockData = { id: "1", heading: "Hi", name: "Test" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: mockData, error: null });
      const result = await getHeroContent(supabase as any);
      expect(result).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith("hero_content");
      expect(supabase.select).toHaveBeenCalledWith("*");
      expect(supabase.limit).toHaveBeenCalledWith(1);
    });

    it("returns null when no data", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await getHeroContent(supabase as any);
      expect(result).toBeNull();
    });

    it("throws on supabase error", async () => {
      const error = new Error("DB error");
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error });
      await expect(getHeroContent(supabase as any)).rejects.toThrow("DB error");
    });
  });

  describe("upsertHeroContent", () => {
    it("updates existing record and returns its id", async () => {
      const existing = { id: "existing-id", heading: "Old" };
      // First maybeSingle call (from getHeroContent) returns existing data
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
      // eq is the terminal for update path
      supabase.eq.mockResolvedValueOnce({ data: null, error: null });

      const result = await upsertHeroContent(supabase as any, { heading: "New" });
      expect(result).toBe("existing-id");
      expect(supabase.update).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith("id", "existing-id");
    });

    it("inserts with defaults when no existing record", async () => {
      // getHeroContent returns null
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // insert().select().single() — single is the terminal
      supabase.single.mockResolvedValueOnce({ data: { id: "new-id" }, error: null });

      const result = await upsertHeroContent(supabase as any, {});
      expect(result).toBe("new-id");
      expect(supabase.insert).toHaveBeenCalled();
      expect(supabase.single).toHaveBeenCalled();
    });

    it("inserts with provided args instead of defaults", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      supabase.single.mockResolvedValueOnce({ data: { id: "custom-id" }, error: null });

      const args = {
        heading: "Custom Heading",
        name: "Custom Name",
        email: "custom@example.com",
      };
      const result = await upsertHeroContent(supabase as any, args);
      expect(result).toBe("custom-id");

      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.heading).toBe("Custom Heading");
      expect(insertCall.name).toBe("Custom Name");
      expect(insertCall.email).toBe("custom@example.com");
    });

    it("throws when update errors", async () => {
      const existing = { id: "id-1", heading: "Hi" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
      const error = new Error("Update failed");
      supabase.eq.mockResolvedValueOnce({ data: null, error });

      await expect(
        upsertHeroContent(supabase as any, { heading: "Fail" }),
      ).rejects.toThrow("Update failed");
    });

    it("throws when insert errors", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const error = new Error("Insert failed");
      supabase.single.mockResolvedValueOnce({ data: null, error });

      await expect(upsertHeroContent(supabase as any, {})).rejects.toThrow(
        "Insert failed",
      );
    });
  });

  describe("seedDefaultHeroContent", () => {
    it("returns existing id if already seeded", async () => {
      const existing = { id: "existing-id", heading: "Hi" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });

      const result = await seedDefaultHeroContent(supabase as any);
      expect(result).toBe("existing-id");
      // Should not insert
      expect(supabase.insert).not.toHaveBeenCalled();
    });

    it("inserts defaults and returns new id when no existing record", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      supabase.single.mockResolvedValueOnce({ data: { id: "seeded-id" }, error: null });

      const result = await seedDefaultHeroContent(supabase as any);
      expect(result).toBe("seeded-id");
      expect(supabase.insert).toHaveBeenCalled();

      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.heading).toBe("Hi, I'm");
      expect(insertCall.name).toBe("Mustafa Sayed");
      expect(insertCall.cv_file_name).toBe("Mustafa_Sayed_Resume.pdf");
    });

    it("throws on insert error", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const error = new Error("Seed insert failed");
      supabase.single.mockResolvedValueOnce({ data: null, error });

      await expect(seedDefaultHeroContent(supabase as any)).rejects.toThrow(
        "Seed insert failed",
      );
    });
  });
});
