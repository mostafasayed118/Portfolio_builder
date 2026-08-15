import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logError, logWarn, logInfo, logDebug, configureLogger, createLogger, setCaptureError } from "./index";

let consoleSpy: {
  error: ReturnType<typeof vi.spyOn>;
  warn: ReturnType<typeof vi.spyOn>;
  log: ReturnType<typeof vi.spyOn>;
};

beforeEach(() => {
  consoleSpy = {
    error: vi.spyOn(console, "error").mockImplementation(() => {}),
    warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
    // info/debug levels are written via console.log — in Node, console.info is
    // an alias of console.log, so spying on it would never intercept the calls.
    log: vi.spyOn(console, "log").mockImplementation(() => {}),
  };
});

afterEach(() => {
  consoleSpy.error.mockRestore();
  consoleSpy.warn.mockRestore();
  consoleSpy.log.mockRestore();
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

  it("logs JSON in production mode (warn goes to stderr / console.error)", () => {
    configureLogger(() => ({ dev: false }));

    logWarn("Prod warning");

    const call = consoleSpy.error.mock.calls[0][0] as string;
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

    expect(consoleSpy.log).toHaveBeenCalledWith("[InfoCtx] Info message");
  });

  it("logs JSON in production mode", () => {
    configureLogger(() => ({ dev: false }));

    logInfo("Prod info");

    const call = consoleSpy.log.mock.calls[0][0] as string;
    const parsed = JSON.parse(call);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("Prod info");
    expect(parsed.timestamp).toBeDefined();
  });
});

describe("logDebug", () => {
  it("logs debug in dev mode", () => {
    configureLogger(() => ({ dev: true }));

    logDebug("Debug message", "DebugCtx");

    expect(consoleSpy.log).toHaveBeenCalledWith("[DebugCtx] Debug message");
  });

  it("logs JSON in production mode via console.log (not stderr)", () => {
    configureLogger(() => ({ dev: false }));

    logDebug("Prod debug");

    const call = consoleSpy.log.mock.calls[0][0] as string;
    const parsed = JSON.parse(call);
    expect(parsed.level).toBe("debug");
    expect(parsed.message).toBe("Prod debug");
    expect(parsed.timestamp).toBeDefined();
  });
});

describe("configureLogger", () => {
  it("defaults to dev mode when not configured", () => {
    // Reset to default by providing a fresh module — but we can test the fallback
    configureLogger(() => { throw new Error("boom"); });

    // Should fallback to dev=true
    logInfo("fallback test");
    expect(consoleSpy.log).toHaveBeenCalledWith("[App] fallback test");
  });
});

describe("createLogger", () => {
  it("applies defaultContext when the call omits one", () => {
    const logger = createLogger({ env: () => ({ dev: true }), defaultContext: "auth-guard" });

    logger.logInfo("hello");

    expect(consoleSpy.log).toHaveBeenCalledWith("[auth-guard] hello");
    // An explicit context still wins over the default.
    logger.logInfo("hello", "explicit");
    expect(consoleSpy.log).toHaveBeenCalledWith("[explicit] hello");
  });

  it("devOnly drops all output in production mode", () => {
    const logger = createLogger({ env: () => ({ dev: false }), devOnly: true });

    logger.logInfo("should be dropped");
    logger.logError("also dropped", new Error("x"));

    expect(consoleSpy.log).not.toHaveBeenCalled();
    expect(consoleSpy.error).not.toHaveBeenCalled();
  });

  it("devOnly keeps output in dev mode", () => {
    const logger = createLogger({ env: () => ({ dev: true }), devOnly: true, defaultContext: "auth-guard" });

    logger.logInfo("dev line");

    expect(consoleSpy.log).toHaveBeenCalledWith("[auth-guard] dev line");
  });

  it("uses its own captureError option instead of the global sink", () => {
    const localCapture = vi.fn();
    const globalCapture = vi.fn();
    setCaptureError(globalCapture);
    try {
      const logger = createLogger({ env: () => ({ dev: true }), captureError: localCapture });

      logger.logError("boom", new Error("e"));

      expect(localCapture).toHaveBeenCalledTimes(1);
      expect(globalCapture).not.toHaveBeenCalled();
    } finally {
      setCaptureError(null);
    }
  });

  it("falls back to the global sink when captureError is omitted", () => {
    const globalCapture = vi.fn();
    setCaptureError(globalCapture);
    try {
      const logger = createLogger({ env: () => ({ dev: true }) });

      logger.logError("boom", new Error("e"));

      expect(globalCapture).toHaveBeenCalledTimes(1);
    } finally {
      setCaptureError(null);
    }
  });

  it("is isolated from the default logger's env configuration", () => {
    configureLogger(() => ({ dev: true }));
    const prodLogger = createLogger({ env: () => ({ dev: false }) });

    prodLogger.logInfo("prod line");

    const call = consoleSpy.log.mock.calls[0][0] as string;
    const parsed = JSON.parse(call);
    expect(parsed.message).toBe("prod line");
    expect(parsed.level).toBe("info");
  });
});
