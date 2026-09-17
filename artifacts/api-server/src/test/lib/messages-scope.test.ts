import { describe, it, expect, vi } from "vitest";
import { scopeMessagesQuery } from "../../lib/messages/scope";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";

describe("scopeMessagesQuery", () => {
  it.each(["admin", "superadmin"])("leaves %s queries to request-client RLS", (role) => {
    const query = { eq: vi.fn(), or: vi.fn() };
    const req = {
      user: { id: "admin-1", role },
      query: { userId: "other-user" },
    } as unknown as AuthenticatedRequest;
    expect(scopeMessagesQuery(query, req)).toBe(query);
    expect(query.eq).not.toHaveBeenCalled();
    expect(query.or).not.toHaveBeenCalled();
  });
});
