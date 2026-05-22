import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import { getTypographySettings, upsertTypographySettings } from "./typographySettings";

describe("typographySettings", () => {
  let supabase: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    supabase = createMockSupabase();
  });

  describe("getTypographySettings", () => {
    it("returns data when found", async () => {
      const mockData = { id: "1", body_font: "Inter", base_font_size: "18px" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: mockData, error: null });
      const result = await getTypographySettings(supabase as any);
      expect(result).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith("typography_settings");
      expect(supabase.select).toHaveBeenCalledWith("*");
      expect(supabase.limit).toHaveBeenCalledWith(1);
    });

    it("returns null when no data", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await getTypographySettings(supabase as any);
      expect(result).toBeNull();
    });

    it("throws on supabase error", async () => {
      const error = new Error("DB error");
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error });
      await expect(getTypographySettings(supabase as any)).rejects.toThrow("DB error");
    });
  });

  describe("upsertTypographySettings", () => {
    it("updates existing record and returns its id", async () => {
      const existing = { id: "typo-1", body_font: "Old" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
      supabase.eq.mockResolvedValueOnce({ data: null, error: null });

      const result = await upsertTypographySettings(supabase as any, {
        body_font: "New Font",
      });
      expect(result).toBe("typo-1");
      expect(supabase.update).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith("id", "typo-1");
    });

    it("inserts with defaults when no existing record", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      supabase.single.mockResolvedValueOnce({ data: { id: "typo-new" }, error: null });

      const result = await upsertTypographySettings(supabase as any, {});
      expect(result).toBe("typo-new");
      expect(supabase.insert).toHaveBeenCalled();

      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.body_font).toBe("Spline Sans");
      expect(insertCall.display_font).toBe("Unbounded");
      expect(insertCall.base_font_size).toBe("16px");
      expect(insertCall.line_height).toBe("1.6");
      expect(insertCall.heading_scale).toBe("1.25");
      expect(insertCall.font_weight_heading).toBe("700");
    });

    it("throws when insert errors", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const error = new Error("Insert failed");
      supabase.single.mockResolvedValueOnce({ data: null, error });

      await expect(upsertTypographySettings(supabase as any, {})).rejects.toThrow(
        "Insert failed",
      );
    });
  });
});
