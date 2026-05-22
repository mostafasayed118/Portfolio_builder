import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import { getLatestCvSettings, upsertCvSettings } from "./cvSettings";

describe("cvSettings", () => {
  let supabase: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    supabase = createMockSupabase();
  });

  describe("getLatestCvSettings", () => {
    it("returns data when found", async () => {
      const mockData = {
        id: "1",
        object_path: "cvs/resume.pdf",
        file_name: "Resume.pdf",
      };
      supabase.maybeSingle.mockResolvedValueOnce({ data: mockData, error: null });
      const result = await getLatestCvSettings(supabase as any);
      expect(result).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith("cv_settings");
      expect(supabase.select).toHaveBeenCalledWith("*");
      expect(supabase.order).toHaveBeenCalledWith("updated_at", { ascending: false });
      expect(supabase.limit).toHaveBeenCalledWith(1);
    });

    it("returns null when no data", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await getLatestCvSettings(supabase as any);
      expect(result).toBeNull();
    });

    it("throws on supabase error", async () => {
      const error = new Error("DB error");
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error });
      await expect(getLatestCvSettings(supabase as any)).rejects.toThrow("DB error");
    });
  });

  describe("upsertCvSettings", () => {
    it("updates existing record and returns its id", async () => {
      const existing = { id: "cv-1", object_path: "old/path.pdf", file_name: "old.pdf" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
      supabase.eq.mockResolvedValueOnce({ data: null, error: null });

      const result = await upsertCvSettings(supabase as any, {
        object_path: "new/path.pdf",
        file_name: "new.pdf",
      });
      expect(result).toBe("cv-1");
      expect(supabase.update).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith("id", "cv-1");
    });

    it("inserts when no existing record", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      supabase.single.mockResolvedValueOnce({ data: { id: "cv-new" }, error: null });

      const result = await upsertCvSettings(supabase as any, {
        object_path: "cvs/fresh.pdf",
        file_name: "Fresh.pdf",
      });
      expect(result).toBe("cv-new");
      expect(supabase.insert).toHaveBeenCalled();

      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.object_path).toBe("cvs/fresh.pdf");
      expect(insertCall.file_name).toBe("Fresh.pdf");
    });

    it("throws when update errors", async () => {
      const existing = { id: "cv-1", object_path: "path.pdf", file_name: "file.pdf" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
      const error = new Error("Update failed");
      supabase.eq.mockResolvedValueOnce({ data: null, error });

      await expect(
        upsertCvSettings(supabase as any, { object_path: "fail.pdf", file_name: "fail.pdf" }),
      ).rejects.toThrow("Update failed");
    });
  });
});
