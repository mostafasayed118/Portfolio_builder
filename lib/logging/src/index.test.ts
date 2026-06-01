import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logError, logWarn, logInfo, configureLogger } from "./index";

let consoleSpy: {
  error: ReturnType<typeof vi.spyOn>;
  warn: ReturnType<typeof vi.spyOn>;
  info: ReturnType<typeof vi.spyOn>;
};

beforeEach(() => {
  consoleSpy = {
    error: vi.spyOn(console, "error").mockImplementation(() => {}),
    warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
    info: vi.spyOn(console, "info").mockImplementation(() => {}),
  };
});

afterEach(() => {
  consoleSpy.error.mockRestore();
  consoleSpy.warn.mockRestore();
  consoleSpy.info.mockRestore();
});

describe("logError", () => {
  it("logs error with message and error object in dev mode", () => {
    configureLogger(() => ({ dev: true }));
    const err = new Error("test error");

    logError("Something failed", err, "TestContext");

    expect(consoleSpy.error).toHaveBeenCalledWith("[TestContext] Something failed", err);
  });

  it("logs JSON in production mode", () => {
    configureLogger(() => ({ dev: false }));
    const err = new Error("prod error");

    logError("Prod failure", err, "ProdCtx");

    const call = consoleSpy.error.mock.calls[0][0] as string;
    const parsed = JSON.parse(call);
    expect(parsed.level).toBe("error");
    expect(parsed.message).toBe("Prod failure");
    expect(parsed.context).toBe("ProdCtx");
    expect(parsed.error.message).toBe("prod error");
    expect(parsed.error.name).toBe("Error");
    expect(parsed.timestamp).toBeDefined();
  });

  it("uses default context 'App' when context is omitted", () => {
    configureLogger(() => ({ dev: true }));

    logError("No context", new Error("e"));

    expect(consoleSpy.error).toHaveBeenCalledWith("[App] No context", expect.any(Error));
  });

  it("handles non-Error values", () => {
    configureLogger(() => ({ dev: false }));

    logError("String error", "string error value");

    const call = consoleSpy.error.mock.calls[0][0] as string;
    const parsed = JSON.parse(call);
    expect(parsed.error).toBe("string error value");
  });
});

describe("logWarn", () => {
  it("logs warning in dev mode", () => {
    configureLogger(() => ({ dev: true }));

    logWarn("Warning message", "WarnCtx");

    expect(consoleSpy.warn).toHaveBeenCalledWith("[WarnCtx] Warning message");
  });

  it("logs JSON in production mode", () => {
    configureLogger(() => ({ dev: false }));

    logWarn("Prod warning");

    const call = consoleSpy.warn.mock.calls[0][0] as string;
    const parsed = JSON.parse(call);
    expect(parsed.level).toBe("warn");
    expect(parsed.message).toBe("Prod warning");
    expect(parsed.context).toBeUndefined();
    expect(parsed.timestamp).toBeDefined();
  });
});

describe("logInfo", () => {
  it("logs info in dev mode", () => {
    configureLogger(() => ({ dev: true }));

    logInfo("Info message", "InfoCtx");

    expect(consoleSpy.info).toHaveBeenCalledWith("[InfoCtx] Info message");
  });

  it("logs JSON in production mode", () => {
    configureLogger(() => ({ dev: false }));

    logInfo("Prod info");

    const call = consoleSpy.info.mock.calls[0][0] as string;
    const parsed = JSON.parse(call);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("Prod info");
    expect(parsed.timestamp).toBeDefined();
  });
});

describe("configureLogger", () => {
  it("defaults to dev mode when not configured", () => {
    // Reset to default by providing a fresh module — but we can test the fallback
    configureLogger(() => { throw new Error("boom"); });

    // Should fallback to dev=true
    logInfo("fallback test");
    expect(consoleSpy.info).toHaveBeenCalledWith("[App] fallback test");
  });
});
