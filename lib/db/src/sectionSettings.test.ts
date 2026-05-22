import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import {
  listSectionSettings,
  updateSectionSetting,
  reorderSectionSettings,
} from "./sectionSettings";

let supabase: ReturnType<typeof createMockSupabase>;
beforeEach(() => {
  supabase = createMockSupabase();
});

describe("listSectionSettings", () => {
  it("selects all section settings ordered by sort_order", async () => {
    const rows = [
      { id: "1", name: "hero", is_visible: true, sort_order: 1 },
      { id: "2", name: "about", is_visible: true, sort_order: 2 },
    ];
    supabase.order.mockResolvedValue({ data: rows, error: null });

    const result = await listSectionSettings(supabase as any);

    expect(supabase.from).toHaveBeenCalledWith("section_settings");
    expect(supabase.select).toHaveBeenCalledWith("*");
    expect(supabase.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(result).toEqual(rows);
  });

  it("throws on error", async () => {
    supabase.order.mockResolvedValue({ data: null, error: new Error("db error") });

    await expect(listSectionSettings(supabase as any)).rejects.toThrow("db error");
  });
});

describe("updateSectionSetting", () => {
  it("updates setting with updated_at timestamp", async () => {
    supabase.eq.mockResolvedValue({ error: null });

    await updateSectionSetting(supabase as any, "sec-1", { is_visible: false });

    expect(supabase.from).toHaveBeenCalledWith("section_settings");
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_visible: false,
        updated_at: expect.any(String),
      }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "sec-1");
  });

  it("throws on error", async () => {
    supabase.eq.mockResolvedValue({ error: new Error("not found") });

    await expect(
      updateSectionSetting(supabase as any, "bad", { is_visible: true }),
    ).rejects.toThrow("not found");
  });
});

describe("reorderSectionSettings", () => {
  it("updates sort_order for each item sequentially", async () => {
    supabase.eq.mockResolvedValue({ error: null });

    const items = [
      { id: "sec-1", sort_order: 2 },
      { id: "sec-2", sort_order: 1 },
      { id: "sec-3", sort_order: 3 },
    ];

    await reorderSectionSettings(supabase as any, items);

    // from() called once per item
    expect(supabase.from).toHaveBeenCalledTimes(3);
    expect(supabase.from).toHaveBeenCalledWith("section_settings");
    // update() called once per item with sort_order and updated_at
    expect(supabase.update).toHaveBeenCalledTimes(3);
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ sort_order: 2, updated_at: expect.any(String) }),
    );
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ sort_order: 1, updated_at: expect.any(String) }),
    );
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ sort_order: 3, updated_at: expect.any(String) }),
    );
    // eq() called once per item
    expect(supabase.eq).toHaveBeenCalledTimes(3);
    expect(supabase.eq).toHaveBeenCalledWith("id", "sec-1");
    expect(supabase.eq).toHaveBeenCalledWith("id", "sec-2");
    expect(supabase.eq).toHaveBeenCalledWith("id", "sec-3");
  });

  it("throws aggregated error on partial failure", async () => {
    // First call succeeds, second fails, third succeeds
    supabase.eq
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: new Error("timeout") })
      .mockResolvedValueOnce({ error: null });

    const items = [
      { id: "sec-1", sort_order: 1 },
      { id: "sec-2", sort_order: 2 },
      { id: "sec-3", sort_order: 3 },
    ];

    await expect(reorderSectionSettings(supabase as any, items)).rejects.toThrow(
      /1 of 3 section order updates failed/,
    );
  });

  it("throws aggregated error listing all failures", async () => {
    supabase.eq
      .mockResolvedValueOnce({ error: new Error("err-a") })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: new Error("err-b") });

    const items = [
      { id: "a", sort_order: 1 },
      { id: "b", sort_order: 2 },
      { id: "c", sort_order: 3 },
    ];

    await expect(reorderSectionSettings(supabase as any, items)).rejects.toThrow(
      /2 of 3 section order updates failed/,
    );
  });
});
