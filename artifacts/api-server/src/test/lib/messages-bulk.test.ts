import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response } from "express";
import { getSupabaseClient } from "../../lib/supabase-client";
import { bulkSoftDeleteHandler, type BulkActionSchema } from "../../lib/messages/bulk";
import { bulkArchiveMessagesSchema } from "@workspace/api-zod";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";

function makeRes() {
  const res = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  };
  return res as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

function makeReq(body: unknown, role = "admin"): AuthenticatedRequest {
  return {
    body,
    user: { id: "a-1", email: "a@b.c", role },
    query: {},
  } as unknown as AuthenticatedRequest;
}

/** Supabase double: update chain whose await resolves with `error`. */
function makeSupabase(error: unknown = null) {
  const chain = {
    update: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    error,
  };
  vi.mocked(getSupabaseClient).mockReturnValue({ from: vi.fn(() => chain) } as never);
  return chain;
}

/** Schema double with a controlled parse result (real schemas exercised too). */
function schemaOk(data: unknown): BulkActionSchemaLike {
  return { safeParse: () => ({ success: true, data }) as never };
}

interface BulkActionSchemaLike {
  safeParse(input: unknown): { success: true; data: never } | { success: false; error: never };
}

describe("bulkSoftDeleteHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalid body → 400 with field errors and a form-level key", async () => {
    makeSupabase();
    const schema: BulkActionSchema = {
      safeParse: () =>
        ({
          success: false,
          error: { flatten: () => ({ fieldErrors: { ids: ["bad id"] }, formErrors: ["pick ids or filter"] }) },
        }) as never,
    };
    const res = makeRes();
    await bulkSoftDeleteHandler(schema, () => "t")(makeReq({}), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      errors: { ids: ["bad id"], form: ["pick ids or filter"] },
    });
  });

  it("invalid body without form errors omits the form key", async () => {
    makeSupabase();
    const schema: BulkActionSchema = {
      safeParse: () =>
        ({ success: false, error: { flatten: () => ({ fieldErrors: { ids: ["bad"] }, formErrors: [] }) } }) as never,
    };
    const res = makeRes();
    await bulkSoftDeleteHandler(schema, () => "t")(makeReq({}), res);

    expect(res.json).toHaveBeenCalledWith({ success: false, errors: { ids: ["bad"] } });
  });

  it("ids path updates deleted_at for the given ids, scoped to the admin", async () => {
    const chain = makeSupabase();
    const res = makeRes();
    const handler = bulkSoftDeleteHandler(schemaOk({ ids: ["id-1", "id-2"] }), () => "TS");
    await handler(makeReq({ ids: ["id-1", "id-2"] }), res);

    expect(chain.update).toHaveBeenCalledWith({ deleted_at: "TS" });
    expect(chain.in).toHaveBeenCalledWith("id", ["id-1", "id-2"]);
    expect(chain.eq).toHaveBeenCalledWith("user_id", "a-1");
    expect(res.json).toHaveBeenCalledWith({ success: true, data: undefined });
  });

  it("filter path applies the SAME view predicates the list endpoint uses", async () => {
    const chain = makeSupabase();
    const res = makeRes();
    const handler = bulkSoftDeleteHandler(schemaOk({ filter: { status: "archived" } }), () => "TS");
    await handler(makeReq({ filter: { status: "archived" } }), res);

    // viewSpec("archived") → softDelete "only" → not("deleted_at", "is", null)
    expect(chain.not).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(chain.in).not.toHaveBeenCalled();
  });

  it("filter path for unread_or_archived uses the disjunction (no soft-delete filter)", async () => {
    const chain = makeSupabase();
    const res = makeRes();
    const handler = bulkSoftDeleteHandler(
      schemaOk({ filter: { preset: "unread_or_archived" } }),
      () => "TS",
    );
    await handler(makeReq({ filter: { preset: "unread_or_archived" } }), res);

    expect(chain.or).toHaveBeenCalledWith("status.eq.unread,deleted_at.not.is.null");
    expect(chain.is).not.toHaveBeenCalledWith("deleted_at", null);
  });

  it("getDeletedAt is invoked per request (factory, not module-load value)", async () => {
    makeSupabase();
    const getDeletedAt = vi.fn(() => "TS");
    const handler = bulkSoftDeleteHandler(schemaOk({ ids: ["id-1"] }), getDeletedAt);
    await handler(makeReq({ ids: ["id-1"] }), makeRes());
    expect(getDeletedAt).toHaveBeenCalledTimes(1);
  });

  it("db error → 500 with a sanitized message", async () => {
    makeSupabase({ message: "boom" });
    const res = makeRes();
    const handler = bulkSoftDeleteHandler(schemaOk({ ids: ["id-1"] }), () => "TS");
    await handler(makeReq({ ids: ["id-1"] }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Internal server error" });
  });

  it("works with the real bulkArchiveMessagesSchema (valid ids accepted)", async () => {
    const chain = makeSupabase();
    const res = makeRes();
    const handler = bulkSoftDeleteHandler(bulkArchiveMessagesSchema, () => "TS");
    await handler(
      makeReq({ ids: ["123e4567-e89b-12d3-a456-426614174000"] }),
      res,
    );
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: "TS" });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: undefined });
  });
});
