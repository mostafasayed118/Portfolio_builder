import { describe, it, expect, vi, beforeEach } from "vitest";
import { reorderItems } from "./reorder";

function createMockChain() {
  return {
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  };
}

describe("reorderItems", () => {
  let supabase: ReturnType<typeof createMockChain>;

  beforeEach(() => {
    supabase = createMockChain();
  });

  it("assigns sort_order as multiples of 10 for each id", async () => {
    await reorderItems(supabase as any, "projects", ["a", "b", "c"]);

    expect(supabase.update).toHaveBeenCalledTimes(3);
    expect(supabase.update).toHaveBeenNthCalledWith(1,
      expect.objectContaining({ sort_order: 10 }),
    );
    expect(supabase.update).toHaveBeenNthCalledWith(2,
      expect.objectContaining({ sort_order: 20 }),
    );
    expect(supabase.update).toHaveBeenNthCalledWith(3,
      expect.objectContaining({ sort_order: 30 }),
    );
  });

  it("filters by id using .eq('id', id)", async () => {
    await reorderItems(supabase as any, "skills", ["id-1", "id-2"]);

    expect(supabase.eq).toHaveBeenCalledTimes(2);
    expect(supabase.eq).toHaveBeenNthCalledWith(1, "id", "id-1");
    expect(supabase.eq).toHaveBeenNthCalledWith(2, "id", "id-2");
  });

  it("returns success: true when all updates succeed", async () => {
    const result = await reorderItems(supabase as any, "experience", ["1", "2"]);

    expect(result).toEqual({ success: true });
  });

  it("returns success: false with error message when an update fails", async () => {
    supabase.eq.mockResolvedValue({ error: { message: "row not found" } });

    const result = await reorderItems(supabase as any, "certifications", ["bad-id"]);

    expect(result).toEqual({ success: false, error: "row not found" });
  });

  it("returns success: false when a synchronous exception is thrown", async () => {
    supabase.from.mockImplementation(() => {
      throw new Error("connection refused");
    });

    const result = await reorderItems(supabase as any, "projects", ["1"]);

    expect(result).toEqual({ success: false, error: "connection refused" });
  });
});
