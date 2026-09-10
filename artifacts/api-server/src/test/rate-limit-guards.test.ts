import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("env numeric clamps", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function contactLimits() {
    const { env } = await import("../lib/env");
    return { max: env.CONTACT_RATE_LIMIT_MAX, window: env.CONTACT_RATE_LIMIT_WINDOW_MS };
  }

  it("CONTACT_RATE_LIMIT_MAX=-1 clamps up to the minimum 1", async () => {
    vi.stubEnv("CONTACT_RATE_LIMIT_MAX", "-1");
    const { max } = await contactLimits();
    expect(max).toBe(1);
  });

  it("CONTACT_RATE_LIMIT_MAX=999999 clamps down to the maximum 1000", async () => {
    vi.stubEnv("CONTACT_RATE_LIMIT_MAX", "999999");
    const { max } = await contactLimits();
    expect(max).toBe(1000);
  });

  it("CONTACT_RATE_LIMIT_MAX=3 is honored inside the clamp range", async () => {
    vi.stubEnv("CONTACT_RATE_LIMIT_MAX", "3");
    const { max } = await contactLimits();
    expect(max).toBe(3);
  });

  it("non-numeric CONTACT_RATE_LIMIT_MAX falls back to the default 5", async () => {
    vi.stubEnv("CONTACT_RATE_LIMIT_MAX", "abc");
    const { max } = await contactLimits();
    expect(max).toBe(5);
  });

  it("CONTACT_RATE_LIMIT_WINDOW_MS=0 clamps up to the minimum 1s", async () => {
    vi.stubEnv("CONTACT_RATE_LIMIT_WINDOW_MS", "0");
    const { window } = await contactLimits();
    expect(window).toBe(1000);
  });

  it("CONTACT_RATE_LIMIT_WINDOW_MS over 24h clamps down", async () => {
    vi.stubEnv("CONTACT_RATE_LIMIT_WINDOW_MS", "999999999");
    const { window } = await contactLimits();
    expect(window).toBe(86_400_000);
  });

  it("IS_PRODUCTION honors NODE_ENV overrides (not raw process.env at import)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { env } = await import("../lib/env");
    expect(env.IS_PRODUCTION).toBe(true);
  });
});
