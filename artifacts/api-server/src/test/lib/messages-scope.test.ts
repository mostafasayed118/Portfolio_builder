import { describe, it, expect, vi } from "vitest";
import { scopeMessagesQuery } from "../../lib/messages/scope";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";

function makeReq(
  user: { id: string; role: string } | undefined,
  query: Record<string, unknown> = {},
): AuthenticatedRequest {
  return { user, query } as unknown as AuthenticatedRequest;
}

function makeQuery() {
  const query = {
    eq: vi.fn(() => query),
    or: vi.fn(() => query),
  };
  return query;
}

describe("scopeMessagesQuery", () => {
  it("superadmin without ?userId leaves the query untouched (sees every row)", () => {
    const query = makeQuery();
    const req = makeReq({ id: "s-1", role: "superadmin" });
    expect(scopeMessagesQuery(query, req)).toBe(query);
    expect(query.eq).not.toHaveBeenCalled();
    expect(query.or).not.toHaveBeenCalled();
  });

  it("superadmin with ?userId scopes to that user", () => {
    const query = makeQuery();
    const req = makeReq({ id: "s-1", role: "superadmin" }, { userId: "u-9" });
    scopeMessagesQuery(query, req);
    expect(query.eq).toHaveBeenCalledWith("user_id", "u-9");
    expect(query.or).not.toHaveBeenCalled();
  });

  it("superadmin with ?userId + includeOrphans also matches ownerless rows", () => {
    const query = makeQuery();
    const req = makeReq({ id: "s-1", role: "superadmin" }, { userId: "u-9" });
    scopeMessagesQuery(query, req, { includeOrphans: true });
    expect(query.or).toHaveBeenCalledWith("user_id.eq.u-9,user_id.is.null");
    expect(query.eq).not.toHaveBeenCalled();
  });

  it("regular admin scopes to their own rows", () => {
    const query = makeQuery();
    const req = makeReq({ id: "a-1", role: "admin" });
    scopeMessagesQuery(query, req);
    expect(query.eq).toHaveBeenCalledWith("user_id", "a-1");
  });

  it("regular admin + includeOrphans also matches ownerless rows", () => {
    const query = makeQuery();
    const req = makeReq({ id: "a-1", role: "admin" });
    scopeMessagesQuery(query, req, { includeOrphans: true });
    expect(query.or).toHaveBeenCalledWith("user_id.eq.a-1,user_id.is.null");
  });

  it("regular admin's ?userId is ignored (no privilege escalation)", () => {
    const query = makeQuery();
    const req = makeReq({ id: "a-1", role: "admin" }, { userId: "victim-1" });
    scopeMessagesQuery(query, req);
    expect(query.eq).toHaveBeenCalledWith("user_id", "a-1");
    expect(query.eq).not.toHaveBeenCalledWith("user_id", "victim-1");
  });

  it("missing identity fails closed to empty string (matches nothing)", () => {
    const query = makeQuery();
    const req = makeReq(undefined);
    scopeMessagesQuery(query, req);
    expect(query.eq).toHaveBeenCalledWith("user_id", "");
  });
});
