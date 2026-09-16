import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import * as zod from "zod";

async function importHandler(loggerError?: ReturnType<typeof vi.fn>) {
  vi.resetModules();

  vi.doMock("../lib/logger", () => ({
    logger: {
      info: vi.fn(),
      error: loggerError ?? vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(),
      level: "silent",
    },
  }));

  return import("../middleware/errorHandler");
}

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
    const { errorHandler } = await importHandler();
    const err = new Error("Something unexpected happened");

    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
    });
  });

  it("does NOT echo the message of an error that merely has name 'ValidationError'", async () => {
    const { errorHandler } = await importHandler();
    const err = new Error("Secret internal path /app/secret-key-value");
    err.name = "ValidationError";

    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message).toBe("Internal server error");
    expect(JSON.stringify(jsonCall)).not.toContain("secret-key-value");
  });

  it("maps a real ZodError to per-field errors with a 400", async () => {
    const { errorHandler } = await importHandler();
    const schema = zod.object({ name: zod.string().min(1, "Name is required") });
    const parsed = schema.safeParse({ name: "" });
    if (parsed.success) throw new Error("expected schema failure");

    errorHandler(parsed.error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      errors: { name: ["Name is required"] },
    });
  });

  it("maps form-level Zod issues to the _form key with a 400", async () => {
    const { errorHandler } = await importHandler();
    const schema = zod.object({ a: zod.string() }).refine(() => false, { message: "Form-level failure" });
    const parsed = schema.safeParse({ a: "x" });
    if (parsed.success) throw new Error("expected schema failure");

    errorHandler(parsed.error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      errors: { _form: ["Form-level failure"] },
    });
  });

  it("returns 400 for SyntaxError with body (malformed JSON)", async () => {
    const { errorHandler } = await importHandler();
    const err = new SyntaxError("Unexpected token in JSON");
    (err as any).body = {};

    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      errors: { _form: ["Invalid JSON in request body"] },
    });
  });

  it("does not leak stack traces in 500 responses", async () => {
    const { errorHandler } = await importHandler();
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

  it("logs unhandled errors via logger", async () => {
    const mockError = vi.fn();
    const { errorHandler } = await importHandler(mockError);
    const err = new Error("DB connection lost");

    errorHandler(err, req as Request, res as Response, next);

    expect(mockError).toHaveBeenCalled();
  });

  it("returns 403 with clear message for CSRF token failures", async () => {
    const { errorHandler } = await importHandler();
    const { invalidCsrfTokenError } = await import("../middleware/csrf");

    errorHandler(invalidCsrfTokenError, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid or missing CSRF token",
    });
  });

  it("handles errors with empty message", async () => {
    const { errorHandler } = await importHandler();
    const err = new Error("");

    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
    });
  });
});
