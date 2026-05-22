import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";

function mockReq(overrides = {}) {
  return { query: {}, params: {}, ...overrides } as any;
}

function mockRes() {
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return res;
}

describe("validateQueryUserId", () => {
  it("passes when no userId query param is present", () => {
    const req = mockReq({ query: {} });
    const res = mockRes();
    const next = vi.fn();

    validateQueryUserId(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("passes with a valid UUID in userId query param", () => {
    const req = mockReq({ query: { userId: "550e8400-e29b-41d4-a716-446655440000" } });
    const res = mockRes();
    const next = vi.fn();

    validateQueryUserId(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 with invalid UUID in userId query param", () => {
    const req = mockReq({ query: { userId: "not-a-uuid" } });
    const res = mockRes();
    const next = vi.fn();

    validateQueryUserId(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid userId format — must be a valid UUID",
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("validateParamId", () => {
  it("passes with a valid UUID in params.id", () => {
    const req = mockReq({ params: { id: "550e8400-e29b-41d4-a716-446655440000" } });
    const res = mockRes();
    const next = vi.fn();

    validateParamId(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 with invalid UUID in params.id", () => {
    const req = mockReq({ params: { id: "12345" } });
    const res = mockRes();
    const next = vi.fn();

    validateParamId(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid id format — must be a valid UUID",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
