import { describe, it, expect, vi } from "vitest";
import { singletonUpsert } from "../../lib/singleton-upsert";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Minimal fake client chain for the calls singletonUpsert makes. */
function createFakeClient(overrides: {
  existingId?: string | null;
  upsertError?: { code?: string; message: string } | null;
  retryError?: { code?: string; message: string } | null;
  winnerId?: string | null;
} = {}) {
  const calls: { method: string; args: unknown[] }[] = [];

  const upsert = vi.fn(async (row: unknown, opts?: unknown) => {
    calls.push({ method: "upsert", args: [row, opts] });
    return { data: null, error: overrides.upsertError ?? null };
  });
  const update = vi.fn(() => ({
    eq: vi.fn(async (_col: string, _val: unknown) => {
      calls.push({ method: "update.eq", args: [_col, _val] });
      return { data: null, error: overrides.retryError ?? null };
    }),
  }));
  const maybeSingle = vi.fn(async () => {
    calls.push({ method: "maybeSingle", args: [] });
    return {
      data: overrides.existingId !== undefined && overrides.existingId !== null
        ? { id: overrides.existingId }
        : null,
      error: null,
    };
  });

  const client = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          maybeSingle,
        })),
      })),
      upsert,
      update,
    })),
  } as unknown as SupabaseClient<any>;

  return { client, calls, upsert, update, maybeSingle };
}

describe("singletonUpsert", () => {
  it("upserts with onConflict targeting the primary key", async () => {
    const { client, calls, upsert } = createFakeClient({ existingId: "row-123" });

    await singletonUpsert(client, "hero_content", { heading: "Hi" });

    const upsertCall = calls.find((c) => c.method === "upsert");
    expect(upsertCall).toBeDefined();
    const [row, opts] = upsertCall!.args as [Record<string, unknown>, { onConflict: string }];
    expect(row.id).toBe("row-123");
    expect(row.heading).toBe("Hi");
    expect(row.updated_at).toBeDefined();
    expect(opts.onConflict).toBe("id");
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("omits id (fresh insert) when no row exists", async () => {
    const { client, calls, upsert } = createFakeClient({ existingId: null });

    await singletonUpsert(client, "about_content", { bio1: "Hello" });

    const upsertCall = calls.find((c) => c.method === "upsert");
    const [row] = upsertCall!.args as [Record<string, unknown>];
    expect(row.id).toBeUndefined();
    expect(row.bio1).toBe("Hello");
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("recovers from a 23505 race by updating the winning row", async () => {
    const { calls, update } = createFakeClient({
      existingId: null,
      winnerId: "winner-456",
    });

    // First read sees no row; the retry read (inside the 23505 handler)
    // sees the winner's row. The maybeSingle mock is shared across calls.
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: "winner-456" }, error: null });

    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ limit: vi.fn(() => ({ maybeSingle })) })),
        upsert: vi.fn(async () => ({
          data: null,
          error: { code: "23505", message: "duplicate key value violates unique constraint" },
        })),
        update,
      })),
    } as unknown as SupabaseClient<any>;

    await singletonUpsert(client, "hero_content", { heading: "Hi" });

    const updateCall = calls.find((c) => c.method === "update.eq");
    expect(updateCall).toBeDefined();
    expect(updateCall!.args[1]).toBe("winner-456");
  });

  it("throws non-23505 errors", async () => {
    const { client } = createFakeClient({
      existingId: null,
      upsertError: { code: "42P01", message: "relation does not exist" },
    });

    await expect(singletonUpsert(client, "hero_content", { heading: "Hi" })).rejects.toThrow(
      "relation does not exist",
    );
  });
});
