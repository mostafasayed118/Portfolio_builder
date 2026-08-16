/**
 * check-vercel-drift.mjs — verify the CLERK_SECRET_KEY Vercel actually holds
 * in Production is still in sync with the repo secret.
 *
 * Vercel stores this key as a `sensitive` (write-only) env var, so its value
 * can never be read back through the API. The check therefore has two layers:
 *
 *   1. Presence — `CLERK_SECRET_KEY` must exist in the project's Production
 *      env (catches accidental deletion or a target-only change).
 *   2. Parity — if the var is an `encrypted` type (readable), its plaintext is
 *      fetched via the env detail endpoint, validated against Clerk, and
 *      byte-compared with the GitHub secret — a mismatch fails the build so
 *      the two stores can never drift. If it is `sensitive` (write-only, the
 *      value can never be read back), a session token is minted with the
 *      GITHUB secret and presented to the DEPLOYED API: resolving the user's
 *      email forces the deployed process to call Clerk's Backend API with ITS
 *      key. A dead, rotated, or foreign-instance key fails that call and the
 *      round-trip, surfacing the drift that byte comparison cannot reach.
 *
 * Fail-closed: any error, missing input, or non-2xx aborts with exit 1.
 *
 * Env used:
 *   VERCEL_TOKEN             — required; Vercel REST API token
 *   VERCEL_API_PROJECT       — required; Vercel project name (portfolio-builder-api)
 *   VERCEL_API_URL           — required; deployed API base URL
 *   VERCEL_TEAM_ID           — optional; team scope for the env endpoints
 *   CLERK_SECRET_KEY         — required; the repo's secret key (GitHub secret)
 *   CLERK_TEST_EMAIL         — optional; email to mint the probe session for
 *                              (defaults to the first ADMIN_EMAILS entry)
 */

import { pathToFileURL } from "node:url";

const VERCEL_API = "https://api.vercel.com";
const CLERK_API = "https://api.clerk.com/v1";

const env = process.env;

/**
 * Fail-closed: throws the bare message so the caller can decide how to exit.
 * The CLI entry point prefixes, logs, and exits 1; tests import the functions
 * and assert the throw without killing the runner.
 */
function fail(message) {
  throw new Error(message);
}

function log(message) {
  console.log(`[vercel-drift] ${message}`);
}

async function clerkFetch(path, { secretKey, method = "GET", body } = {}) {
  const res = await fetch(`${CLERK_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  return res;
}

/** Find a Clerk user by email, or create one (idempotent). */
async function findOrCreateUser(secretKey, email) {
  const list = await clerkFetch(`/users?email_address[]=${encodeURIComponent(email)}`, { secretKey });
  if (!list.ok) fail(`cannot reach Clerk with the repo secret (${list.status}) — repo key drift?`);
  const body = await list.json();
  const users = Array.isArray(body) ? body : (body.data ?? []);
  // Clerk's `email_address[]` filter is unreliable (it can return unrelated
  // users first), so never trust `users[0]` — verify the address actually
  // matches before reusing the account, otherwise the probe session is minted
  // for the wrong person and the round-trip fails with a false drift alarm.
  const match = users.find((u) => {
    const addrs = Array.isArray(u.email_addresses) ? u.email_addresses : [];
    return (
      addrs.some((a) => a.email_address?.toLowerCase() === email.toLowerCase()) ||
      u.primary_email_address?.toLowerCase() === email.toLowerCase()
    );
  });
  if (match) return match.id;
  const create = await clerkFetch("/users", {
    secretKey,
    method: "POST",
    body: { email_address: [email], first_name: "E2E", last_name: "Tester", skip_password_requirement: true },
  });
  const created = await create.json();
  if (!create.ok) fail(`cannot create probe user in Clerk (${create.status})`);
  return created.id;
}

/** Resolve the email the probe session is minted for. */
function resolveProbeEmail() {
  if (env.CLERK_TEST_EMAIL) return env.CLERK_TEST_EMAIL;
  const first = env.ADMIN_EMAILS?.split(",").map((e) => e.trim()).filter(Boolean)[0];
  return first ?? "e2e-admin-tester@example.com";
}

/**
 * Fail if the Vercel token is a `vca_`-prefixed CLI session token instead of
 * a long-lived dashboard access token.
 *
 * The Vercel CLI's OAuth login writes a short-lived session token (`vca_` +
 * 54 chars) that it silently rotates. Storing THAT in the VERCEL_TOKEN
 * secret makes the drift job work today and die with auth errors the moment
 * the session rotates or expires — the rotating-token trap. Dashboard tokens
 * (vercel.com/account/tokens) are plain alphanumeric and never expire, and
 * the `vca_` prefix is the reliable tell, so a session token fails here
 * regardless of whether it still authenticates right now.
 */
function assertDashboardToken(token) {
  if (!token) fail("VERCEL_TOKEN is not set as a GitHub Actions secret");
  if (token.startsWith("vca_")) {
    fail(
      "VERCEL_TOKEN is a vca_ session token (written by the Vercel CLI), not a " +
        "dashboard access token. Create a long-lived token at " +
        "https://vercel.com/account/tokens, then update the GitHub secret.",
    );
  }
  return token;
}

async function main() {
  const token = assertDashboardToken(env.VERCEL_TOKEN);
  const project = env.VERCEL_API_PROJECT;
  const deployedUrl = (env.VERCEL_API_URL || "").replace(/\/+$/, "");
  const repoKey = env.CLERK_SECRET_KEY;

  if (!project) fail("VERCEL_API_PROJECT is not set");
  if (!deployedUrl) fail("VERCEL_API_URL is not set");
  if (!repoKey) fail("CLERK_SECRET_KEY is not set as a GitHub Actions secret");

  const teamQuery = env.VERCEL_TEAM_ID ? `&teamId=${encodeURIComponent(env.VERCEL_TEAM_ID)}` : "";
  const baseHeaders = { Authorization: `Bearer ${token}` };

  // ── 1. Presence: CLERK_SECRET_KEY must exist in the Production env ──
  let envRes;
  try {
    envRes = await fetch(`${VERCEL_API}/v9/projects/${project}/env?target=production${teamQuery}`, {
      headers: baseHeaders,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    fail(`could not reach Vercel (${err?.message ?? err}) — is VERCEL_TOKEN valid/expired?`);
  }
  if (envRes.status === 401) fail("VERCEL_TOKEN is invalid or expired — create a fresh Vercel token and update the secret");
  if (!envRes.ok) fail(`Vercel env list returned ${envRes.status}`);

  const envList = (await envRes.json()).envs ?? [];
  const productionEntry = envList.find(
    (e) => e.key === "CLERK_SECRET_KEY" && (Array.isArray(e.target) ? e.target.includes("production") : e.target === "production"),
  );
  if (!productionEntry) {
    fail("CLERK_SECRET_KEY is MISSING from the Vercel Production env — it was deleted or its target changed");
  }
  log("CLERK_SECRET_KEY present in Vercel Production env");

  // ── 2a. Readable (encrypted) var: fetch the plaintext, validate + byte-compare ──
  if (productionEntry.type !== "sensitive") {
    log("Vercel value is readable — fetching the plaintext to compare with the GitHub secret");
    let detail;
    try {
      const detailRes = await fetch(
        `${VERCEL_API}/v9/projects/${project}/env/${productionEntry.id}?${teamQuery.replace(/^&/, "")}`,
        { headers: baseHeaders, signal: AbortSignal.timeout(15_000) },
      );
      if (!detailRes.ok) fail(`could not read the Vercel CLERK_SECRET_KEY value (${detailRes.status})`);
      detail = await detailRes.json();
    } catch (err) {
      fail(`could not read the Vercel CLERK_SECRET_KEY value (${err?.message ?? err})`);
    }
    const vercelValue = detail?.value ?? "";
    if (!vercelValue) fail("Vercel returned an empty CLERK_SECRET_KEY value");
    const clerkCheck = await clerkFetch("/instance", { secretKey: vercelValue });
    if (!clerkCheck.ok) {
      fail(`the key Vercel holds is invalid against Clerk (${clerkCheck.status})`);
    }
    if (vercelValue !== repoKey) {
      fail(
        "DRIFT: GitHub's CLERK_SECRET_KEY differs from the Vercel Production value — " +
          "update one of the stores so both match",
      );
    }
    log("Vercel CLERK_SECRET_KEY matches the GitHub secret and is valid against Clerk");
    return;
  }

  // ── 2b. Masked (sensitive, write-only): interop check through the deployed API ──
  log("Vercel value is masked (sensitive, write-only) — verifying interop through the deployed API");
  const email = resolveProbeEmail();
  const userId = await findOrCreateUser(repoKey, email);

  const sessionRes = await clerkFetch("/sessions", {
    secretKey: repoKey,
    method: "POST",
    body: { user_id: userId },
  });
  const session = await sessionRes.json();
  if (!sessionRes.ok) fail(`cannot mint a probe session with the repo secret (${sessionRes.status})`);
  const sid = session.id;

  let jwt;
  try {
    const tokenRes = await clerkFetch(`/sessions/${sid}/tokens`, { secretKey: repoKey, method: "POST", body: {} });
    const tokenBody = await tokenRes.json();
    if (!tokenRes.ok) fail(`cannot mint a session token (${tokenRes.status})`);
    jwt = tokenBody.jwt;
  } finally {
    // Always clean up the probe session (even if minting the token failed).
    await clerkFetch(`/sessions/${sid}/revoke`, { secretKey: repoKey, method: "POST" }).catch(() => {});
  }

  log(`probe session minted for ${email}; presenting to ${deployedUrl}`);
  let apiRes;
  try {
    apiRes = await fetch(`${deployedUrl}/api/v1/admin/users/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    fail(`could not reach the deployed API (${err?.message ?? err})`);
  }
  if (apiRes.status !== 200) {
    fail(
      `DRIFT: the deployed API rejected the token minted by the repo secret (HTTP ${apiRes.status}). ` +
        "The CLERK_SECRET_KEY Vercel holds is dead, rotated, or from a different Clerk instance — " +
        "update it in the Vercel project settings (Production) and redeploy.",
    );
  }
  log("deployed API accepted the GitHub-secret token — Vercel's CLERK_SECRET_KEY is in sync");
}

// Run only when executed directly (not when imported by tests):
//   node scripts/check-vercel-drift.mjs
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error(`[vercel-drift] FAIL: ${err?.message ?? String(err)}`);
    process.exit(1);
  });
}

export { findOrCreateUser, resolveProbeEmail, assertDashboardToken, clerkFetch, fail, log, main };
