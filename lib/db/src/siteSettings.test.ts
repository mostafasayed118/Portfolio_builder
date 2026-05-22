import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import {
  getSiteSettings,
  fetchLanguageSettings,
  updateLanguageSettings,
  upsertSiteSettings,
} from "./siteSettings";

describe("siteSettings", () => {
  let supabase: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    supabase = createMockSupabase();
  });

  describe("getSiteSettings", () => {
    it("returns data when found", async () => {
      const mockData = { id: "1", site_name: "My Site", default_theme: "dark" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: mockData, error: null });
      const result = await getSiteSettings(supabase as any);
      expect(result).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith("site_settings");
      expect(supabase.select).toHaveBeenCalledWith("*");
      expect(supabase.limit).toHaveBeenCalledWith(1);
    });

    it("returns null when no data", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await getSiteSettings(supabase as any);
      expect(result).toBeNull();
    });

    it("throws on supabase error", async () => {
      const error = new Error("DB error");
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error });
      await expect(getSiteSettings(supabase as any)).rejects.toThrow("DB error");
    });
  });

  describe("fetchLanguageSettings", () => {
    it("returns language settings when data exists", async () => {
      const mockData = {
        language_mode: "both",
        default_language: "ar",
        show_language_toggle: true,
        rtl_enabled: true,
      };
      supabase.maybeSingle.mockResolvedValueOnce({ data: mockData, error: null });
      const result = await fetchLanguageSettings(supabase as any);
      expect(result).toEqual({
        language_mode: "both",
        default_language: "ar",
        show_language_toggle: true,
        rtl_enabled: true,
      });
    });

    it("returns defaults on error", async () => {
      const error = new Error("DB error");
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error });
      const result = await fetchLanguageSettings(supabase as any);
      expect(result).toEqual({
        language_mode: "en_only",
        default_language: "en",
        show_language_toggle: false,
        rtl_enabled: false,
      });
    });

    it("returns defaults when no data", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await fetchLanguageSettings(supabase as any);
      expect(result).toEqual({
        language_mode: "en_only",
        default_language: "en",
        show_language_toggle: false,
        rtl_enabled: false,
      });
    });
  });

  describe("updateLanguageSettings", () => {
    it("returns {success: true} on successful update of existing record", async () => {
      const existing = { id: "site-1", site_name: "Site" };
      // getSiteSettings returns existing
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
      // update().eq() returns success
      supabase.eq.mockResolvedValueOnce({ data: null, error: null });

      const result = await updateLanguageSettings(supabase as any, {
        language_mode: "both",
      });
      expect(result).toEqual({ success: true });
      expect(supabase.update).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith("id", "site-1");
    });

    it("returns {success: true} on successful insert when no existing record", async () => {
      // getSiteSettings returns null
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // insert returns success (insert().eq... no, insert is terminal-ish)
      // Looking at the code: insert({...}) — error comes from destructuring
      // Since insert returns `this` and we don't call single/eq after,
      // the destructuring `{ error }` gets from the chain object.
      // Actually: supabase.from("site_settings").insert({...}) —
      // insert returns `this` (the chain). The destructuring `{ error }` gets `chain.error`
      // which is undefined. So error is undefined, which is falsy — no throw.
      // We just need to not have insert throw. Since insert is mockReturnThis(),
      // the destructuring `{ error }` = { error: undefined } which is fine.

      const result = await updateLanguageSettings(supabase as any, {
        language_mode: "ar_only",
      });
      expect(result).toEqual({ success: true });
      expect(supabase.insert).toHaveBeenCalled();
    });

    it("returns {success: false, error} on update error", async () => {
      const existing = { id: "site-1", site_name: "Site" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
      const error = new Error("Update failed");
      supabase.eq.mockResolvedValueOnce({ data: null, error });

      const result = await updateLanguageSettings(supabase as any, {
        language_mode: "both",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });
  });

  describe("upsertSiteSettings", () => {
    it("updates existing record and returns its id", async () => {
      const existing = { id: "site-1", site_name: "Old Site" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
      supabase.eq.mockResolvedValueOnce({ data: null, error: null });

      const result = await upsertSiteSettings(supabase as any, {
        site_name: "New Site",
      });
      expect(result).toBe("site-1");
      expect(supabase.update).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith("id", "site-1");
    });

    it("inserts with defaults when no existing record", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      supabase.single.mockResolvedValueOnce({ data: { id: "site-new" }, error: null });

      const result = await upsertSiteSettings(supabase as any, {});
      expect(result).toBe("site-new");
      expect(supabase.insert).toHaveBeenCalled();

      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.site_name).toBe("Mustafa Sayed");
      expect(insertCall.site_tagline).toBe("Data Engineer");
      expect(insertCall.logo_text).toBe("MS");
      expect(insertCall.default_theme).toBe("dark");
    });

    it("throws on insert error", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const error = new Error("Insert failed");
      supabase.single.mockResolvedValueOnce({ data: null, error });

      await expect(upsertSiteSettings(supabase as any, {})).rejects.toThrow(
        "Insert failed",
      );
    });
  });
});
