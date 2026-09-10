import { describe, it, expect } from "vitest";
import { resolveTargetUserId } from "../../lib/user-scope";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";

function mockReq(role: string, id: string | undefined): AuthenticatedRequest {
  return {
    user: id ? { id, email: "admin@test.com", role } : undefined,
  } as unknown as AuthenticatedRequest;
}

describe("resolveTargetUserId", () => {
  it("returns the queryUserId for a superadmin when one is passed", () => {
    expect(resolveTargetUserId(mockReq("superadmin", "requester-1"), "target-user")).toBe("target-user");
  });

  it("returns null for a superadmin with no queryUserId — meaning all users", () => {
    expect(resolveTargetUserId(mockReq("superadmin", "requester-1"), undefined)).toBeNull();
  });

  it("returns the requester's own id for a non-superadmin", () => {
    expect(resolveTargetUserId(mockReq("user", "requester-1"), "target-user")).toBe("requester-1");
    expect(resolveTargetUserId(mockReq("user", "requester-1"), undefined)).toBe("requester-1");
  });

  it("returns null when the requester has no id", () => {
    expect(resolveTargetUserId(mockReq("user", undefined), undefined)).toBeNull();
  });
});
