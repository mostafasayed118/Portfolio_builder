import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
