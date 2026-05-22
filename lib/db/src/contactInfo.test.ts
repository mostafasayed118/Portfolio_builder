import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import { getContactInfo, upsertContactInfo } from "./contactInfo";

describe("contactInfo", () => {
  let supabase: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    supabase = createMockSupabase();
  });

  describe("getContactInfo", () => {
    it("returns data when found", async () => {
      const mockData = { id: "1", email: "test@example.com", phone: "+20 123" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: mockData, error: null });
      const result = await getContactInfo(supabase as any);
      expect(result).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith("contact_info");
      expect(supabase.select).toHaveBeenCalledWith("*");
      expect(supabase.limit).toHaveBeenCalledWith(1);
    });

    it("returns null when no data", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await getContactInfo(supabase as any);
      expect(result).toBeNull();
    });

    it("throws on supabase error", async () => {
      const error = new Error("DB error");
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error });
      await expect(getContactInfo(supabase as any)).rejects.toThrow("DB error");
    });
  });

  describe("upsertContactInfo", () => {
    it("updates existing record and returns its id", async () => {
      const existing = { id: "contact-1", email: "old@test.com" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
      supabase.eq.mockResolvedValueOnce({ data: null, error: null });

      const result = await upsertContactInfo(supabase as any, { email: "new@test.com" });
      expect(result).toBe("contact-1");
      expect(supabase.update).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith("id", "contact-1");
    });

    it("inserts with defaults when no existing record", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      supabase.single.mockResolvedValueOnce({ data: { id: "contact-new" }, error: null });

      const result = await upsertContactInfo(supabase as any, {});
      expect(result).toBe("contact-new");
      expect(supabase.insert).toHaveBeenCalled();

      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.email).toBe("mustafasayedsaeed@outlook.com");
      expect(insertCall.phone).toBe("+20 100 000 0000");
      expect(insertCall.location).toBe("Cairo, Egypt");
      expect(insertCall.github).toBe("https://github.com/mustafasayed");
      expect(insertCall.linkedin).toBe("https://linkedin.com/in/mustafasayed");
    });

    it("inserts with provided args and sanitizes URLs", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      supabase.single.mockResolvedValueOnce({ data: { id: "contact-custom" }, error: null });

      const result = await upsertContactInfo(supabase as any, {
        email: "custom@test.com",
        github: "https://github.com/custom",
        linkedin: "https://linkedin.com/in/custom",
      });
      expect(result).toBe("contact-custom");

      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.email).toBe("custom@test.com");
      expect(insertCall.github).toBe("https://github.com/custom");
    });

    it("throws when update errors", async () => {
      const existing = { id: "contact-1", email: "test@test.com" };
      supabase.maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
      const error = new Error("Update failed");
      supabase.eq.mockResolvedValueOnce({ data: null, error });

      await expect(
        upsertContactInfo(supabase as any, { email: "fail@test.com" }),
      ).rejects.toThrow("Update failed");
    });

    it("throws when insert errors", async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const error = new Error("Insert failed");
      supabase.single.mockResolvedValueOnce({ data: null, error });

      await expect(upsertContactInfo(supabase as any, {})).rejects.toThrow(
        "Insert failed",
      );
    });
  });
});
