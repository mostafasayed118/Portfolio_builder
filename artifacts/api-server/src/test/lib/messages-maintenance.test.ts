import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  archiveTestSubmissions,
  restoreAllArchived,
  TEST_SUBMISSION_EMAILS,
  ARCHIVED_ROWS,
} from "../../lib/messages/maintenance";

/** Distinct chains for the count query and the update query. */
function makeSupabase(opts: {
  count?: number | null;
  countError?: unknown;
  updateError?: unknown;
} = {}): SupabaseClient {
  const countChain = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    count: opts.count ?? null,
    error: opts.countError ?? null,
  };
  const updateChain = {
    update: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    error: opts.updateError ?? null,
  };
  const from = vi.fn().mockReturnValueOnce(countChain).mockReturnValue(updateChain);
  return { supabase: { from } as unknown as SupabaseClient, countChain, updateChain };
}

describe("archiveTestSubmissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts then archives with the identical test-email predicate", async () => {
    const { supabase, countChain, updateChain } = makeSupabase({ count: 7 });

    const result = await archiveTestSubmissions(supabase);

    expect(result).toEqual({ ok: true, count: 7 });
    expect(countChain.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(countChain.or).toHaveBeenCalledWith(TEST_SUBMISSION_EMAILS);
    expect(countChain.is).toHaveBeenCalledWith("deleted_at", null);
    // Update targets the identical predicate — byte for byte.
    expect(updateChain.or).toHaveBeenCalledWith(TEST_SUBMISSION_EMAILS);
    expect(updateChain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(updateChain.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
  });

  it("null count resolves to 0 (no visible test rows)", async () => {
    const { supabase } = makeSupabase({ count: null });
    const result = await archiveTestSubmissions(supabase);
    expect(result).toEqual({ ok: true, count: 0 });
  });

  it("count error → db_error with sanitized message, update never runs", async () => {
    const { supabase, updateChain } = makeSupabase({ countError: { code: "42P01", message: "missing table" } });
    const result = await archiveTestSubmissions(supabase);
    expect(result).toEqual({
      ok: false,
      message: "Service is initializing — please try again shortly.",
    });
    expect(updateChain.update).not.toHaveBeenCalled();
  });

  it("update error → db_error with sanitized message", async () => {
    const { supabase } = makeSupabase({ count: 1, updateError: { message: "boom" } });
    const result = await archiveTestSubmissions(supabase);
    expect(result).toEqual({ ok: false, message: "Internal server error" });
  });
});

describe("restoreAllArchived", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts then restores with the identical archived predicate", async () => {
    const { supabase, countChain, updateChain } = makeSupabase({ count: 3 });

    const result = await restoreAllArchived(supabase);

    expect(result).toEqual({ ok: true, count: 3 });
    expect(countChain.not).toHaveBeenCalledWith(...ARCHIVED_ROWS);
    expect(updateChain.update).toHaveBeenCalledWith({ deleted_at: null });
    expect(updateChain.not).toHaveBeenCalledWith(...ARCHIVED_ROWS);
  });

  it("null count resolves to 0", async () => {
    const { supabase } = makeSupabase({ count: null });
    const result = await restoreAllArchived(supabase);
    expect(result).toEqual({ ok: true, count: 0 });
  });

  it("count error → db_error, update never runs", async () => {
    const { supabase, updateChain } = makeSupabase({ countError: { message: "network" } });
    const result = await restoreAllArchived(supabase);
    expect(result).toEqual({
      ok: false,
      message: "Upstream service timed out. Please try again.",
    });
    expect(updateChain.update).not.toHaveBeenCalled();
  });
});

describe("predicate constants", () => {
  it("TEST_SUBMISSION_EMAILS covers e2e-, qa.verify. and test@test.com", () => {
    expect(TEST_SUBMISSION_EMAILS).toBe(
      "email.ilike.e2e-%,email.ilike.qa.verify.%,email.ilike.test@test.com",
    );
  });

  it("ARCHIVED_ROWS selects deleted_at IS NOT NULL", () => {
    expect(ARCHIVED_ROWS).toEqual(["deleted_at", "is", null]);
  });
});
