import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requireSuperadmin } from "../../middleware/requireSuperadmin";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";

function mockReq(user?: { id: string; email: string; role: string }): AuthenticatedRequest {
  return { user } as AuthenticatedRequest;
}

function mockRes() {
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return res;
}

describe("requireSuperadmin middleware", () => {
  it("calls next() for superadmin role", () => {
    const req = mockReq({ id: "user-1", email: "admin@test.com", role: "superadmin" });
    const res = mockRes();
    const next = vi.fn();

    requireSuperadmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 for user role", () => {
    const req = mockReq({ id: "user-2", email: "user@test.com", role: "user" });
    const res = mockRes();
    const next = vi.fn();

    requireSuperadmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Superadmin access required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when no user on request", () => {
    const req = mockReq(undefined);
    const res = mockRes();
    const next = vi.fn();

    requireSuperadmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Superadmin access required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() only once for superadmin", () => {
    const req = mockReq({ id: "user-1", email: "admin@test.com", role: "superadmin" });
    const res = mockRes();
    const next = vi.fn();

    requireSuperadmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
