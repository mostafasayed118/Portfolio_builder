import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

describe("Global Error Handler", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { log: { error: vi.fn() } as any };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  it("returns 500 with safe message for unhandled errors", async () => {
    // Dynamically import to get the real errorHandler (not the mocked one from setup.ts)
    vi.resetModules();

    vi.doMock("../lib/logger", () => ({
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        child: vi.fn(),
        level: "silent",
      },
    }));

    const { errorHandler } = await import("../middleware/errorHandler");
    const err = new Error("Something unexpected happened");

    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
    });
  });

  it("returns 400 for ValidationError", async () => {
    vi.resetModules();

    vi.doMock("../lib/logger", () => ({
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        child: vi.fn(),
        level: "silent",
      },
    }));

    const { errorHandler } = await import("../middleware/errorHandler");
    const err = new Error("Invalid input data");
    err.name = "ValidationError";

    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid input data",
    });
  });

  it("does not leak stack traces in 500 responses", async () => {
    vi.resetModules();

    vi.doMock("../lib/logger", () => ({
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        child: vi.fn(),
        level: "silent",
      },
    }));

    const { errorHandler } = await import("../middleware/errorHandler");
    const err = new Error("Secret database password: hunter2");
    err.stack = `Error: Secret database password: hunter2
      at secretFunction (/app/src/secret.ts:42:10)
      at /app/src/config/database.ts:123:5`;

    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message).toBe("Internal server error");
    expect(jsonCall.message).not.toContain("hunter2");
    expect(JSON.stringify(jsonCall)).not.toContain("secretFunction");
    expect(JSON.stringify(jsonCall)).not.toContain("database.ts");
  });

  it("does not leak stack traces in ValidationError responses", async () => {
    vi.resetModules();

    vi.doMock("../lib/logger", () => ({
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        child: vi.fn(),
        level: "silent",
      },
    }));

    const { errorHandler } = await import("../middleware/errorHandler");
    const err = new Error("Field validation failed at /app/internal");
    err.name = "ValidationError";
    err.stack = `Error: Field validation failed
      at validateField (/app/src/internal/validator.ts:99:15)`;

    errorHandler(err, req as Request, res as Response, next);

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // ValidationError includes the message but not the stack
    expect(jsonCall.message).toBe("Field validation failed at /app/internal");
    expect(JSON.stringify(jsonCall)).not.toContain("validator.ts");
  });

  it("logs unhandled errors via logger", async () => {
    vi.resetModules();

    const mockError = vi.fn();
    vi.doMock("../lib/logger", () => ({
      logger: {
        info: vi.fn(),
        error: mockError,
        warn: vi.fn(),
        debug: vi.fn(),
        child: vi.fn(),
        level: "silent",
      },
    }));

    const { errorHandler } = await import("../middleware/errorHandler");
    const err = new Error("DB connection lost");

    errorHandler(err, req as Request, res as Response, next);

    expect(mockError).toHaveBeenCalled();
  });

  it("handles errors with empty message", async () => {
    vi.resetModules();

    vi.doMock("../lib/logger", () => ({
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        child: vi.fn(),
        level: "silent",
      },
    }));

    const { errorHandler } = await import("../middleware/errorHandler");
    const err = new Error("");

    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
    });
  });
});
