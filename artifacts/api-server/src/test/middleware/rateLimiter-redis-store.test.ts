import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import express, { type RequestHandler } from "express";
import request from "supertest";

/**
 * Wiring tests for the shared Redis rate-limit store. Third-party boundaries
 * (ioredis, rate-limit-redis) are mocked; the first-party middleware under
 * test is imported for real. REDIS_URL is evaluated at module init (top-level
 * await), so every test re-imports the module after stubbing env and
 * resetting the module registry.
 */

interface RedisStoreOptions {
  readonly prefix?: string;
  readonly sendCommand: (...args: string[]) => Promise<unknown>;
}

interface CapturedStore {
  readonly init: Mock;
  readonly increment: Mock;
  readonly decrement: Mock;
  readonly resetKey: Mock;
  readonly options: RedisStoreOptions;
}

const { redisCtorMock, redisCallMock, redisStoreCtorMock, storeInstances } = vi.hoisted(() => ({
  redisCtorMock: vi.fn(),
  redisCallMock: vi.fn<(command: string, ...args: string[]) => Promise<unknown>>(),
  redisStoreCtorMock: vi.fn(),
  storeInstances: [] as CapturedStore[],
}));

vi.mock("ioredis", () => ({ default: redisCtorMock }));
vi.mock("rate-limit-redis", () => ({ RedisStore: redisStoreCtorMock }));

describe("rateLimiter shared Redis store wiring", () => {
  beforeEach(() => {
    vi.resetModules();
    storeInstances.length = 0;
    redisCtorMock.mockReset();
    redisCtorMock.mockImplementation(() => ({ on: vi.fn(), call: redisCallMock }));
    redisStoreCtorMock.mockReset();
    redisStoreCtorMock.mockImplementation((options: RedisStoreOptions) => {
      const store = {
        init: vi.fn(),
        increment: vi.fn(async () => ({ totalHits: 1, resetTime: new Date(Date.now() + 60_000) })),
        decrement: vi.fn(async () => undefined),
        resetKey: vi.fn(async () => undefined),
        options,
      };
      storeInstances.push(store);
      return store;
    });
    // Defaults for a fully active limiter set; individual tests override REDIS_URL.
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DISABLE_RATE_LIMIT", "false");
    vi.stubEnv("REDIS_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function importLimiterModule(): Promise<Record<string, unknown>> {
    return import("../../middleware/rateLimiter");
  }

  function exportedLimiters(module: Record<string, unknown>): Array<[string, RequestHandler]> {
    return Object.entries(module).filter(
      (entry): entry is [string, RequestHandler] => typeof entry[1] === "function",
    );
  }

  async function hitWith(limiter: RequestHandler): Promise<number> {
    const app = express();
    app.use(limiter);
    app.get("/limited", (_req, res) => {
      res.json({ ok: true });
    });
    const res = await request(app).get("/limited").set("x-admin-key", "test-key");
    return res.status;
  }

  it("connects ONE ioredis client and gives every limiter its own Redis store with a unique prefix", async () => {
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    const mod = await importLimiterModule();

    expect(redisCtorMock).toHaveBeenCalledTimes(1);
    expect(redisCtorMock).toHaveBeenCalledWith("redis://localhost:6379");

    const limiterEntries = exportedLimiters(mod);
    expect(limiterEntries.length).toBe(7);
    expect(redisStoreCtorMock).toHaveBeenCalledTimes(limiterEntries.length);

    const prefixes = redisStoreCtorMock.mock.calls.map((call) => (call[0] as RedisStoreOptions).prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);

    // Each limiter must count hits through its OWN store instance, and no
    // other store may be touched (express-rate-limit rejects shared stores).
    for (const [index, [name, limiter]] of limiterEntries.entries()) {
      const countsBefore = storeInstances.map((store) => store.increment.mock.calls.length);
      expect(await hitWith(limiter), `${name} should serve the first request`).toBe(200);
      for (const [i, store] of storeInstances.entries()) {
        const delta = store.increment.mock.calls.length - countsBefore[i];
        if (i === index) {
          expect(delta, `${name} uses its own store`).toBe(1);
        } else {
          expect(delta, `${name} must not touch other limiters' stores`).toBe(0);
        }
      }
    }
  });

  it("keeps express-rate-limit's default MemoryStore when REDIS_URL is unset", async () => {
    vi.stubEnv("REDIS_URL", "");
    const mod = await importLimiterModule();

    expect(redisCtorMock).not.toHaveBeenCalled();
    expect(redisStoreCtorMock).not.toHaveBeenCalled();

    expect(await hitWith(mod.generalLimiter as RequestHandler)).toBe(200);
  });

  it("passes ioredis raw command results through sendCommand for rate-limit-redis", async () => {
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    redisCallMock.mockResolvedValue([2, 900]);
    await importLimiterModule();

    const { options } = storeInstances[0];
    await expect(options.sendCommand("EVALSHA", "sha1", "1", "key")).resolves.toStrictEqual([2, 900]);
    expect(redisCallMock).toHaveBeenCalledWith("EVALSHA", ["sha1", "1", "key"]);
  });

  it("fails fast instead of passing non-scalar ioredis replies to rate-limit-redis", async () => {
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    redisCallMock.mockResolvedValue(null);
    await importLimiterModule();

    const { options } = storeInstances[0];
    await expect(options.sendCommand("EVALSHA", "sha1", "1", "key")).rejects.toThrow(TypeError);
  });
});
