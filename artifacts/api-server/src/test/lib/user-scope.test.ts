import { describe, it, expect } from "vitest";
import { resolveTargetUserId, InvalidTargetUserIdError } from "../../lib/user-scope";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

function mockReq(role: string, id: string | undefined): AuthenticatedRequest {
  return {
    user: id ? { id, email: "admin@test.com", role } : undefined,
  } as unknown as AuthenticatedRequest;
}

describe("resolveTargetUserId", () => {
  it("returns the queryUserId for a superadmin when a valid UUID is passed", () => {
    expect(resolveTargetUserId(mockReq("superadmin", "requester-1"), VALID_UUID)).toBe(VALID_UUID);
  });

  it("throws InvalidTargetUserIdError for a superadmin passing a non-UUID (fail closed)", () => {
    expect(() =>
      resolveTargetUserId(mockReq("superadmin", "requester-1"), "target-user"),
    ).toThrow(InvalidTargetUserIdError);
  });

  it("returns null for a superadmin with no queryUserId — meaning all users", () => {
    expect(resolveTargetUserId(mockReq("superadmin", "requester-1"), undefined)).toBeNull();
  });

  it("returns the requester's own id for a non-superadmin (passed userId ignored)", () => {
    expect(resolveTargetUserId(mockReq("user", "requester-1"), VALID_UUID)).toBe("requester-1");
    expect(resolveTargetUserId(mockReq("user", "requester-1"), undefined)).toBe("requester-1");
  });

  it("returns null when the requester has no id", () => {
    expect(resolveTargetUserId(mockReq("user", undefined), undefined)).toBeNull();
  });
});
