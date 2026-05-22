import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import { getThemeSettings, upsertThemeSettings } from "./themeSettings";

describe("themeSettings", () => {
  let supabase: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    supabase = createMockSupabase();
  });

  describe("getThemeSettings", () => {
    it("returns data when found", async () => {
      const mockData = { id: "1", mode: "dark", radius: "0.5rem" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: mockData, error: null });
      const result = await getThemeSettings(supabase as any);
      expect(result).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith("theme_settings");
      expect(supabase.select).toHaveBeenCalledWith("*");
      expect(supabase.limit).toHaveBeenCalledWith(1);
    });

    it("returns null when no data", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await getThemeSettings(supabase as any);
      expect(result).toBeNull();
    });

    it("throws on supabase error", async () => {
      const error = new Error("DB error");
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error });
      await expect(getThemeSettings(supabase as any)).rejects.toThrow("DB error");
    });
  });

  describe("upsertThemeSettings", () => {
    it("updates existing record and returns its id", async () => {
      const existing = { id: "theme-1", mode: "light" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
      supabase.eq.mockResolvedValueOnce({ data: null, error: null });

      const result = await upsertThemeSettings(supabase as any, { mode: "dark" });
      expect(result).toBe("theme-1");
      expect(supabase.update).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith("id", "theme-1");
    });

    it("inserts with defaults when no existing record", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      supabase.single.mockResolvedValueOnce({ data: { id: "theme-new" }, error: null });

      const result = await upsertThemeSettings(supabase as any, {});
      expect(result).toBe("theme-new");
      expect(supabase.insert).toHaveBeenCalled();

      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.mode).toBe("light");
      expect(insertCall.light_primary).toBe("204 92% 42%");
      expect(insertCall.dark_primary).toBe("204 92% 62%");
      expect(insertCall.dark_background).toBe("222 48% 6%");
      expect(insertCall.radius).toBe("0.9rem");
    });

    it("inserts with provided args overriding defaults", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      supabase.single.mockResolvedValueOnce({ data: { id: "theme-custom" }, error: null });

      const result = await upsertThemeSettings(supabase as any, {
        mode: "dark",
        radius: "1rem",
      });
      expect(result).toBe("theme-custom");

      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.mode).toBe("dark");
      expect(insertCall.radius).toBe("1rem");
    });

    it("throws when insert errors", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const error = new Error("Insert failed");
      supabase.single.mockResolvedValueOnce({ data: null, error });

      await expect(upsertThemeSettings(supabase as any, {})).rejects.toThrow(
        "Insert failed",
      );
    });
  });
});
