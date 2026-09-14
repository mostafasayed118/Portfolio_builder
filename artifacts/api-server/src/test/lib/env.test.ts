import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { env, _setOverride, _resetOverrides } from "../../lib/env";

/**
 * env.PORT resilience — the server must never crash on a placeholder or
 * invalid ambient PORT (e.g. PaaS/dev sandboxes exporting PORT=0). Invalid
 * values fall back to the default 3001 so the process can still start.
 */
describe("env.PORT", () => {
  beforeEach(() => {
    _resetOverrides();
  });
  afterEach(() => {
    _resetOverrides();
  });

  it("returns the default 3001 when PORT is missing", () => {
    _setOverride("PORT", "");
    expect(env.PORT).toBe(3001);
  });

  it("returns a valid configured PORT", () => {
    _setOverride("PORT", "5173");
    expect(env.PORT).toBe(5173);
  });

  it("falls back to the default when PORT=0 (ambient PaaS/sandbox placeholder)", () => {
    _setOverride("PORT", "0");
    expect(env.PORT).toBe(3001);
  });

  it("falls back to the default for negative values", () => {
    _setOverride("PORT", "-1");
    expect(env.PORT).toBe(3001);
  });

  it("falls back to the default for non-numeric values", () => {
    _setOverride("PORT", "abc");
    expect(env.PORT).toBe(3001);
  });

  it("falls back to the default for values above the TCP port range", () => {
    _setOverride("PORT", "70000");
    expect(env.PORT).toBe(3001);
  });

  it("parses a decimal string", () => {
    _setOverride("PORT", "8080");
    expect(env.PORT).toBe(8080);
  });
});

describe("env.SMTP_PORT", () => {
  beforeEach(() => {
    _resetOverrides();
  });
  afterEach(() => {
    _resetOverrides();
  });

  it("returns the default 465 when SMTP_PORT is missing", () => {
    _setOverride("SMTP_PORT", "");
    expect(env.SMTP_PORT).toBe(465);
  });

  it("returns a valid configured SMTP_PORT", () => {
    _setOverride("SMTP_PORT", "587");
    expect(env.SMTP_PORT).toBe(587);
  });

  it("falls back to the default for SMTP_PORT=0", () => {
    _setOverride("SMTP_PORT", "0");
    expect(env.SMTP_PORT).toBe(465);
  });

  it("falls back to the default for negative values", () => {
    _setOverride("SMTP_PORT", "-1");
    expect(env.SMTP_PORT).toBe(465);
  });

  it("falls back to the default for non-numeric values", () => {
    _setOverride("SMTP_PORT", "smtp");
    expect(env.SMTP_PORT).toBe(465);
  });

  it("falls back to the default for values above the TCP port range", () => {
    _setOverride("SMTP_PORT", "99999");
    expect(env.SMTP_PORT).toBe(465);
  });
});

/**
 * ADMIN_API_KEY strength gate — the key bypasses Clerk entirely, so a short
 * or placeholder value must be flagged at startup: exit in production,
 * warn everywhere else. Non-production warns (local dev keeps booting with
 * the .env.example value); production hard-exits.
 */
describe("env.checkAdminApiKeyStrength", () => {
  const strongKey = "a".repeat(32) + "1B2c3D4e";

  beforeEach(() => {
    _resetOverrides();
  });
  afterEach(() => {
    _resetOverrides();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("does not warn when ADMIN_API_KEY is not set", () => {
    _setOverride("ADMIN_API_KEY", undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    env.checkAdminApiKeyStrength();

    expect(warn).not.toHaveBeenCalled();
  });

  it("warns (but does not exit) for a short key outside production", () => {
    _setOverride("ADMIN_API_KEY", "short-key");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);

    env.checkAdminApiKeyStrength();

    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/ADMIN_API_KEY is too weak/));
    expect(exit).not.toHaveBeenCalled();
  });

  it("warns for a >=32-char placeholder value", () => {
    _setOverride("ADMIN_API_KEY", "your-admin-api-key-change-me-000000000000");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    env.checkAdminApiKeyStrength();

    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/too weak/));
  });

  it("does not warn for a strong (>=32 char, non-placeholder) key", () => {
    _setOverride("ADMIN_API_KEY", strongKey);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    env.checkAdminApiKeyStrength();

    expect(warn).not.toHaveBeenCalled();
  });

  it("exits when a weak key is configured in production", () => {
    _setOverride("NODE_ENV", "production");
    _setOverride("ADMIN_API_KEY", "too-short");
    // IS_TEST also checks process.env.VITEST — un-stub it so the production
    // branch (IS_PRODUCTION && !IS_TEST) is reachable.
    vi.stubEnv("VITEST", "false");
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation(((code?: number) => {
        throw new Error(`process.exit(${code})`);
      }) as never);
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => env.checkAdminApiKeyStrength()).toThrow(/process\.exit\(1\)/);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("validate() surfaces the weak-key warning", () => {
    _setOverride("ADMIN_API_KEY", "placeholder-value-that-is-long-enough-to-pass-length");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = env.validate();

    expect(result.ok).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/too weak/));
  });
});
