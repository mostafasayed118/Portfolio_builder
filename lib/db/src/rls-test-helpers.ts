import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const LOCAL_URL = "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const LOCAL_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const LOCAL_JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? LOCAL_URL;
const ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY ?? LOCAL_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_KEY ?? LOCAL_SERVICE_KEY;
const JWT_SECRET = process.env.SUPABASE_TEST_JWT_SECRET ?? LOCAL_JWT_SECRET;

function b64url(input: string | Uint8Array): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function signToken(claims: { sub: string; email?: string }): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: "supabase-demo",
      aud: "authenticated",
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...claims,
    }),
  );
  const data = `${header}.${payload}`;
  const sig = b64url(createHmac("sha256", JWT_SECRET).update(data).digest());
  return `${data}.${sig}`;
}

export function clientFor(identity: { sub: string; email?: string }): SupabaseClient {
  const token = signToken(identity);
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    accessToken: async () => token,
  });
}

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function isLocalSupabaseUp(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: { apikey: ANON_KEY } });
    return res.ok;
  } catch {
    return false;
  }
}

export interface SeedResult {
  portfolioA: string;
  portfolioB: string;
  portfolioC: string;
}

/**
 * Seeds two identities and three portfolios (A published, B draft, C published)
 * with the service client (bypasses RLS). Idempotent across runs: previously
 * seeded test portfolios are deleted first — the portfolio_id ON DELETE CASCADE
 * FK wipes any content previous test runs created against them.
 */
export async function ensureSchema(): Promise<SeedResult> {
  const svc = serviceClient();
  const testSlugs = ["rls-test-a", "rls-test-b", "rls-test-c"];

  const { error: cleanErr } = await svc.from("portfolios").delete().in("slug", testSlugs);
  if (cleanErr !== null) throw new Error(`cleanup test portfolios failed: ${cleanErr.message}`);

  const { error: userErr } = await svc.from("users").upsert(
    [
      { clerk_id: "user_test_ownerA", email: "owner-a@test.local", role: "superadmin" },
      { clerk_id: "user_test_ownerB", email: "owner-b@test.local", role: "user" },
    ],
    { onConflict: "clerk_id" },
  );
  if (userErr !== null) throw new Error(`seed users failed: ${userErr.message}`);

  const portfolios = [
    { slug: "rls-test-a", title: "Test Portfolio A", is_published: true, owner_user_id: "user_test_ownerA" },
    { slug: "rls-test-b", title: "Test Portfolio B", is_published: false, owner_user_id: "user_test_ownerA" },
    { slug: "rls-test-c", title: "Test Portfolio C", is_published: true, owner_user_id: "user_test_ownerB" },
  ];
  const { error: pfErr } = await svc.from("portfolios").upsert(portfolios, { onConflict: "slug" });
  if (pfErr !== null) throw new Error(`seed portfolios failed: ${pfErr.message}`);

  const { data, error } = await svc.from("portfolios").select("id, slug");
  if (data === null || error !== null) throw new Error(`read portfolios failed: ${error?.message}`);
  const byslug = new Map(data.map((row) => [row.slug, row.id]));
  const a = byslug.get("rls-test-a");
  const b = byslug.get("rls-test-b");
  const c = byslug.get("rls-test-c");
  if (a === undefined || b === undefined || c === undefined) {
    throw new Error("seed did not create all three portfolios");
  }
  return { portfolioA: a, portfolioB: b, portfolioC: c };
}
