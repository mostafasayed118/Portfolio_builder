import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import {
  getAboutContent,
  upsertAboutContent,
} from "./aboutContent";

describe("aboutContent", () => {
  let supabase: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    supabase = createMockSupabase();
  });

  describe("getAboutContent", () => {
    it("returns data when found", async () => {
      const mockData = { id: "1", bio1: "Hello", location: "Cairo" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: mockData, error: null });
      const result = await getAboutContent(supabase as any);
      expect(result).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith("about_content");
      expect(supabase.select).toHaveBeenCalledWith("*");
      expect(supabase.limit).toHaveBeenCalledWith(1);
    });

    it("returns null when no data", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await getAboutContent(supabase as any);
      expect(result).toBeNull();
    });

    it("throws on supabase error", async () => {
      const error = new Error("DB error");
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error });
      await expect(getAboutContent(supabase as any)).rejects.toThrow("DB error");
    });
  });

  describe("upsertAboutContent", () => {
    it("updates existing record and returns its id", async () => {
      const existing = { id: "about-1", bio1: "Old bio" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
      supabase.eq.mockResolvedValueOnce({ data: null, error: null });

      const result = await upsertAboutContent(supabase as any, { bio1: "New bio" });
      expect(result).toBe("about-1");
      expect(supabase.update).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith("id", "about-1");
    });

    it("inserts with defaults when no existing record", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      supabase.single.mockResolvedValueOnce({ data: { id: "about-new" }, error: null });

      const result = await upsertAboutContent(supabase as any, {});
      expect(result).toBe("about-new");
      expect(supabase.insert).toHaveBeenCalled();
      expect(supabase.single).toHaveBeenCalled();

      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.location).toBe("Cairo, Egypt");
      expect(insertCall.years_of_experience).toBe(1);
      expect(insertCall.degree).toBe("B.Sc. Statistics & Computer Science");
      expect(insertCall.is_published).toBe(true);
    });

    it("inserts with provided args instead of defaults", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      supabase.single.mockResolvedValueOnce({ data: { id: "custom-about" }, error: null });

      const result = await upsertAboutContent(supabase as any, {
        bio1: "Custom bio",
        location: "Alexandria",
      });
      expect(result).toBe("custom-about");

      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.bio1).toBe("Custom bio");
      expect(insertCall.location).toBe("Alexandria");
    });

    it("throws when update errors", async () => {
      const existing = { id: "about-1", bio1: "Bio" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
      const error = new Error("Update failed");
      supabase.eq.mockResolvedValueOnce({ data: null, error });

      await expect(
        upsertAboutContent(supabase as any, { bio1: "Fail" }),
      ).rejects.toThrow("Update failed");
    });

    it("throws when insert errors", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const error = new Error("Insert failed");
      supabase.single.mockResolvedValueOnce({ data: null, error });

      await expect(upsertAboutContent(supabase as any, {})).rejects.toThrow(
        "Insert failed",
      );
    });
  });
});
