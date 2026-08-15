/**
 * Regression tests for `findOrCreateUser` in check-vercel-drift.mjs.
 *
 * The historical bug: Clerk's `email_address[]` search is unreliable — it can
 * return unrelated users first — and the helper trusted `users[0]`, so the
 * probe session was minted for the wrong account (the e2eclerkadmin test
 * user, which is not in the deployed ADMIN_EMAILS allowlist). The round-trip
 * then 401'd and the CI parity job reported a fake CLERK_SECRET_KEY drift.
 *
 * These tests pin the fix: the returned accounts are verified to actually
 * contain the probe email before one is reused, and the account is created
 * only when no match exists. The mock replaces global fetch, so no real Clerk
 * calls happen. Importing the module must also be side-effect free (the
 * top-level `main()` only runs when the file is executed directly) — if that
 * guard regressed, this file would not even load.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { findOrCreateUser, resolveProbeEmail } from "./check-vercel-drift.mjs";

const TARGET_EMAIL = "al3tar66@gmail.com";
// Unrelated account returned FIRST — the trap the old code fell into.
const WRONG_USER = {
  id: "user_wrong_first",
  email_addresses: [{ email_address: "e2eclerkadmin@emalupe.com" }],
};
const TARGET_USER = {
  id: "user_target_second",
  email_addresses: [{ email_address: TARGET_EMAIL }],
};

function response(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

/** Minimal fetch router: first route whose method + substring matches wins. */
function route(routes) {
  return vi.fn(async (url, options = {}) => {
    const method = options.method ?? "GET";
    const u = String(url);
    for (const r of routes) {
      if ((r.method ?? "GET") === method && u.includes(r.match)) return r.res;
    }
    throw new Error(`unexpected fetch: ${method} ${u}`);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("findOrCreateUser — email-match selection (regression)", () => {
  it("picks the returned user whose email matches, NOT users[0]", async () => {
    vi.stubGlobal("fetch", route([{ match: "/users?email_address[]=", res: response([WRONG_USER, TARGET_USER]) }]));

    const id = await findOrCreateUser("sk_test_x", TARGET_EMAIL);
    expect(id).toBe("user_target_second");
  });

  it("handles the { data: [...] } envelope response shape", async () => {
    vi.stubGlobal(
      "fetch",
      route([{ match: "/users?email_address[]=", res: response({ data: [WRONG_USER, TARGET_USER] }) }]),
    );

    const id = await findOrCreateUser("sk_test_x", TARGET_EMAIL);
    expect(id).toBe("user_target_second");
  });

  it("matches on primary_email_address when email_addresses is absent", async () => {
    const primaryOnly = { id: "user_primary", primary_email_address: TARGET_EMAIL };
    vi.stubGlobal("fetch", route([{ match: "/users?email_address[]=", res: response([WRONG_USER, primaryOnly]) }]));

    const id = await findOrCreateUser("sk_test_x", TARGET_EMAIL);
    expect(id).toBe("user_primary");
  });

  it("creates the user (with the target email) when no returned account matches", async () => {
    const fetchMock = route([
      { match: "/users?email_address[]=", res: response([WRONG_USER]) },
      { match: "/users", method: "POST", res: response({ id: "user_created" }) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const id = await findOrCreateUser("sk_test_x", TARGET_EMAIL);
    expect(id).toBe("user_created");

    const postCall = fetchMock.mock.calls.find(([, o]) => o?.method === "POST");
    expect(postCall).toBeDefined();
    expect(JSON.parse(postCall[1].body).email_address).toEqual([TARGET_EMAIL]);
  });

  it("fails closed when the search request is rejected", async () => {
    vi.stubGlobal(
      "fetch",
      route([{ match: "/users?email_address[]=", res: response({}, false, 401) }]),
    );

    await expect(findOrCreateUser("sk_test_x", TARGET_EMAIL)).rejects.toThrow(/repo key drift/);
  });

  it("fails closed when the create request is rejected", async () => {
    vi.stubGlobal(
      "fetch",
      route([
        { match: "/users?email_address[]=", res: response([WRONG_USER]) },
        { match: "/users", method: "POST", res: response({}, false, 400) },
      ]),
    );

    await expect(findOrCreateUser("sk_test_x", TARGET_EMAIL)).rejects.toThrow(/cannot create probe user/);
  });
});

describe("resolveProbeEmail", () => {
  const original = {
    CLERK_TEST_EMAIL: process.env.CLERK_TEST_EMAIL,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  };

  afterEach(() => {
    process.env.CLERK_TEST_EMAIL = original.CLERK_TEST_EMAIL;
    process.env.ADMIN_EMAILS = original.ADMIN_EMAILS;
  });

  it("prefers CLERK_TEST_EMAIL when set", () => {
    process.env.CLERK_TEST_EMAIL = "probe@example.com";
    process.env.ADMIN_EMAILS = "first@example.com";
    expect(resolveProbeEmail()).toBe("probe@example.com");
  });

  it("falls back to the first ADMIN_EMAILS entry", () => {
    delete process.env.CLERK_TEST_EMAIL;
    process.env.ADMIN_EMAILS = "first@example.com, second@example.com";
    expect(resolveProbeEmail()).toBe("first@example.com");
  });

  it("defaults to the known admin when neither is set", () => {
    delete process.env.CLERK_TEST_EMAIL;
    delete process.env.ADMIN_EMAILS;
    expect(resolveProbeEmail()).toBe("e2e-admin-tester@example.com");
  });
});
