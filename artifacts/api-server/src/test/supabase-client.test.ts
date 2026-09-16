import { describe, expect, it, vi, beforeEach } from "vitest";

const createClientMock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));
// test/setup.ts installs a GLOBAL mock of ../lib/supabase-client — bypass it so
// these tests exercise the real factory code.
vi.mock("../lib/supabase-client", async (importOriginal) => {
  return await importOriginal<typeof import("../lib/supabase-client")>();
});

describe("supabase-client factories", () => {
  beforeEach(() => {
    createClientMock.mockClear();
    process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-service-key";
    process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
  });

  it("builds a request-scoped client from the anon key with an accessToken hook", async () => {
    const { getRequestSupabaseClient } = await import("../lib/supabase-client");
    getRequestSupabaseClient("clerk-jwt-abc");
    expect(createClientMock).toHaveBeenCalled();
    const [, key, options] = createClientMock.mock.calls[0] as [
      string,
      string,
      { accessToken?: () => Promise<string> },
    ];
    expect(key).toBe(process.env.SUPABASE_ANON_KEY);
    expect(typeof options.accessToken).toBe("function");
    await expect(options.accessToken?.()).resolves.toBe("clerk-jwt-abc");
  });

  it("returns an anon client with no accessToken hook when no token is given", async () => {
    const { getAnonSupabaseClient } = await import("../lib/supabase-client");
    getAnonSupabaseClient();
    const [, key, options] = createClientMock.mock.calls[0] as [
      string,
      string,
      { accessToken?: () => Promise<string> },
    ];
    expect(key).toBe(process.env.SUPABASE_ANON_KEY);
    expect(options.accessToken).toBeUndefined();
  });

  it("keeps the service-role singleton for system routes", async () => {
    const { getSupabaseClient } = await import("../lib/supabase-client");
    getSupabaseClient();
    expect(createClientMock).toHaveBeenCalled();
    const key = createClientMock.mock.calls[0]?.[1];
    expect(key).toBe(process.env.SUPABASE_SERVICE_ROLE_KEY);
  });
});
