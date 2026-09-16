import { describe, it, expect, beforeEach } from "vitest";
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
  it("updates setting with updated_at timestamp and returns the matched row count", async () => {
    supabase.select.mockResolvedValue({ data: [{ id: "sec-1" }], error: null });

    const matched = await updateSectionSetting(supabase as any, "sec-1", { is_visible: false });

    expect(supabase.from).toHaveBeenCalledWith("section_settings");
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_visible: false,
        updated_at: expect.any(String),
      }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "sec-1");
    expect(supabase.select).toHaveBeenCalledWith("id");
    expect(matched).toBe(1);
  });

  it("returns 0 matched rows when the id does not exist", async () => {
    supabase.select.mockResolvedValue({ data: [], error: null });

    const matched = await updateSectionSetting(supabase as any, "missing", { is_visible: true });

    expect(supabase.select).toHaveBeenCalledWith("id");
    expect(matched).toBe(0);
  });

  it("throws on error", async () => {
    supabase.select.mockResolvedValue({ data: null, error: new Error("not found") });

    await expect(
      updateSectionSetting(supabase as any, "bad", { is_visible: true }),
    ).rejects.toThrow("not found");
  });
});

describe("reorderSectionSettings", () => {
  it("calls the reorder_sections RPC once with parallel id and sort_order arrays", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    const items = [
      { id: "sec-1", sort_order: 2 },
      { id: "sec-2", sort_order: 1 },
      { id: "sec-3", sort_order: 3 },
    ];

    await reorderSectionSettings(supabase as any, items);

    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith("reorder_sections", {
      section_ids: ["sec-1", "sec-2", "sec-3"],
      sort_orders: [2, 1, 3],
    });
    // Atomic RPC — no per-row UPDATE fan-out.
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.update).not.toHaveBeenCalled();
  });

  it("throws on RPC error", async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "reorder_sections failed" },
    });

    const items = [
      { id: "sec-1", sort_order: 1 },
      { id: "sec-2", sort_order: 2 },
    ];

    await expect(reorderSectionSettings(supabase as any, items)).rejects.toThrow(
      "reorder_sections failed",
    );
  });

  it("propagates synchronous/rejected RPC failures", async () => {
    supabase.rpc.mockRejectedValue(new Error("network down"));

    const items = [{ id: "sec-1", sort_order: 1 }];

    await expect(reorderSectionSettings(supabase as any, items)).rejects.toThrow(
      "network down",
    );
  });
});
