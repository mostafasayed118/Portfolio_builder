import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls: Array<{ url: string; authorization: string | null }> = [];
let deferreds: Array<{ resolve: (value: Response) => void }> = [];

function fetchResponse(): Response {
  return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
  vi.resetModules();
  calls.length = 0;
  deferreds = [];
  vi.stubGlobal("fetch", vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({ url: String(_input), authorization: headers.get("authorization") });
    return new Promise<Response>((resolve) => deferreds.push({ resolve }));
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function loadClient() {
  return import("@workspace/supabase/client");
}

async function upload(client: Awaited<ReturnType<typeof loadClient>>) {
  const supabase = client.getSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase.storage.from("cv").upload("11111111-1111-4111-8111-111111111111/cv-1.pdf", new Blob(["%PDF"]), { contentType: "application/pdf" });
}

async function flushTo(count: number) {
  await vi.waitFor(() => expect(calls).toHaveLength(count));
  while (deferreds.length > 0) deferreds.shift()?.resolve(fetchResponse());
}

function expectStorageError(promise: Promise<unknown>, message: string) {
  return expect(promise).resolves.toMatchObject({ error: { message } });
}

describe("browser Supabase JWT registration", () => {
  it("preserves anonymous access when no token getter is registered", async () => {
    const client = await loadClient();
    const pending = upload(client);
    await flushTo(1);
    await expect(pending).resolves.toMatchObject({ error: null });
    expect(calls[0]?.authorization).toBe("Bearer anon-key");
  });

  it("sends a fresh Clerk token on every storage request", async () => {
    const client = await loadClient();
    const getter = vi.fn().mockResolvedValue("first-jwt");
    client.setSupabaseAccessTokenGetter(getter);
    const first = upload(client);
    await flushTo(1);
    await expect(first).resolves.toMatchObject({ error: null });
    getter.mockResolvedValue("rotated-jwt");
    const second = upload(client);
    await flushTo(2);
    await expect(second).resolves.toMatchObject({ error: null });
    expect(calls[0]?.authorization).toBe("Bearer first-jwt");
    expect(calls[1]?.authorization).toBe("Bearer rotated-jwt");
  });

  it("fails closed when the getter returns no token", async () => {
    const client = await loadClient();
    client.setSupabaseAccessTokenGetter(async () => null);
    await expectStorageError(upload(client), "Supabase authentication is required");
    expect(calls).toHaveLength(0);
    client.setSupabaseAccessTokenGetter(null);
    const pending = upload(client);
    await flushTo(1);
    await expect(pending).resolves.toMatchObject({ error: null });
    expect(calls[0]?.authorization).toBe("Bearer anon-key");
  });

  it("invalidates retained clients and pending tokens on session change", async () => {
    const client = await loadClient();
    let finish: (token: string) => void = () => {};
    client.setSupabaseAccessTokenGetter(() => new Promise<string>((resolve) => { finish = resolve; }));
    const pending = upload(client);
    client.setSupabaseAccessTokenGetter(async () => "new-session-jwt");
    finish("stale-session-jwt");
    await expectStorageError(pending, "Supabase session changed");
    const next = upload(client);
    await flushTo(1);
    await expect(next).resolves.toMatchObject({ error: null });
    expect(calls[0]?.authorization).toBe("Bearer new-session-jwt");
  });
});
