/**
 * check-gemini-health.mjs — live availability / error-rate monitor for the
 * admin AI-assistant endpoints (the Gemini-backed tools).
 *
 * Probes all four /api/v1/admin/ai-assistant endpoints with a real admin
 * session (admin key + double-submit CSRF), classifies every response
 * (success / Gemini provider error with its HTTP status / other), and
 * aggregates availability, error rate, latency percentiles, and the Gemini
 * status histogram.
 *
 * Why a probe loop instead of Vercel logs: the runtime-logs REST endpoint
 * returns nothing for this account, so per-request history is only visible in
 * the Vercel dashboard (or via a Log Drain). This script is the API-side
 * equivalent — run it on demand or on a schedule (e.g. every 5 min for 24h)
 * to build the history.
 *
 * Usage:
 *   VERCEL_TOKEN=<sbp/vcp token> node scripts/check-gemini-health.mjs
 *   ADMIN_API_KEY=<key> node scripts/check-gemini-health.mjs --duration 120 --interval 10
 *
 * Env:
 *   VERCEL_TOKEN  — Vercel REST API token used to fetch ADMIN_API_KEY from the
 *                   project's Production env (ignored when ADMIN_API_KEY is set)
 *   ADMIN_API_KEY — the deployed API's admin key (bypasses the Vercel fetch)
 *
 * Options:
 *   --base <url>        deployed API base URL (default https://portfolio-builder-api-six.vercel.app)
 *   --project <id>      Vercel project id holding ADMIN_API_KEY (default prj_71W9pYATbz7WdBiBvRoKlWNX2UFe)
 *   --duration <s>      how long to probe (default 60)
 *   --interval <s>      pause between rounds of all four endpoints (default 10)
 */

import { pathToFileURL } from "node:url";

const DEFAULT_BASE = "https://portfolio-builder-api-six.vercel.app";
const DEFAULT_PROJECT = "prj_71W9pYATbz7WdBiBvRoKlWNX2UFe";
const UA = "check-gemini-health/1.0";

const ENDPOINTS = [
  ["generate-description", { techStack: ["react", "node", "postgresql"], title: "Health Probe" }],
  ["suggest-categories", { skillName: "React Native" }],
  ["suggest-tags", { techStack: ["next.js", "supabase"] }],
  ["analyze-content", { content: "I am a full-stack developer building web applications.", contentType: "about" }],
];

function parseArgs(argv) {
  const opts = { base: DEFAULT_BASE, project: DEFAULT_PROJECT, duration: 60, interval: 10 };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--base" && value) opts.base = value;
    if (flag === "--project" && value) opts.project = value;
    if (flag === "--duration" && value) opts.duration = Number(value);
    if (flag === "--interval" && value) opts.interval = Number(value);
  }
  return opts;
}

/** Classify a single probe response into a monitor-friendly record. */
export function classifyResponse(status, bodyText, durationMs) {
  if (status === 200) {
    return { outcome: "success", status, durationMs, geminiStatus: null, detail: "ok" };
  }
  const geminiMatch = /Gemini API (\d{3})/.exec(bodyText ?? "");
  if (status === 500 && geminiMatch) {
    return { outcome: "gemini-error", status, durationMs, geminiStatus: Number(geminiMatch[1]), detail: bodyText.slice(0, 80) };
  }
  if (status === 500 && /timed out|timeout|aborted/i.test(bodyText ?? "")) {
    return { outcome: "timeout", status, durationMs, geminiStatus: null, detail: bodyText.slice(0, 80) };
  }
  return { outcome: "other-error", status, durationMs, geminiStatus: null, detail: (bodyText ?? "").slice(0, 80) };
}

/** Aggregate probe records into availability / error-rate / latency summary. */
export function summarize(records) {
  const byEndpoint = new Map();
  for (const r of records) {
    if (!byEndpoint.has(r.endpoint)) {
      byEndpoint.set(r.endpoint, { total: 0, success: 0, errors: 0, durations: [], geminiStatuses: new Map() });
    }
    const bucket = byEndpoint.get(r.endpoint);
    bucket.total += 1;
    if (r.outcome === "success") bucket.success += 1;
    else bucket.errors += 1;
    bucket.durations.push(r.durationMs);
    if (r.geminiStatus) {
      bucket.geminiStatuses.set(r.geminiStatus, (bucket.geminiStatuses.get(r.geminiStatus) ?? 0) + 1);
    }
  }

  const percentile = (sorted, p) => {
    if (sorted.length === 0) return 0;
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return Math.round(sorted[idx]);
  };

  const rows = [...byEndpoint.entries()].map(([endpoint, b]) => {
    const sorted = [...b.durations].sort((a, c) => a - c);
    const gemini = [...b.geminiStatuses.entries()].map(([s, n]) => `${s}×${n}`).join(", ") || "—";
    return {
      endpoint,
      total: b.total,
      success: b.success,
      errors: b.errors,
      availabilityPct: b.total === 0 ? 0 : Math.round((b.success / b.total) * 1000) / 10,
      p50Ms: percentile(sorted, 50),
      p95Ms: percentile(sorted, 95),
      gemini,
    };
  });

  const totals = records.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.outcome === "success") acc.success += 1;
      else acc.errors += 1;
      return acc;
    },
    { total: 0, success: 0, errors: 0 },
  );

  const allDurations = records.map((r) => r.durationMs).sort((a, c) => a - c);
  const geminiHistogram = records.reduce((acc, r) => {
    if (r.geminiStatus) acc.set(r.geminiStatus, (acc.get(r.geminiStatus) ?? 0) + 1);
    return acc;
  }, new Map());

  return {
    totals,
    availabilityPct: totals.total === 0 ? 0 : Math.round((totals.success / totals.total) * 1000) / 10,
    p50Ms: percentile(allDurations, 50),
    p95Ms: percentile(allDurations, 95),
    geminiStatuses: [...geminiHistogram.entries()].map(([s, n]) => `${s}×${n}`).join(", ") || "—",
    rows,
  };
}

function printSummary(summary) {
  console.log("\n=== Gemini / ai-assistant health ===");
  console.log(`requests: ${summary.totals.total}  success: ${summary.totals.success}  errors: ${summary.totals.errors}  availability: ${summary.availabilityPct}%`);
  console.log(`latency: p50 ${summary.p50Ms}ms  p95 ${summary.p95Ms}ms`);
  console.log(`Gemini provider statuses: ${summary.geminiStatuses}`);
  console.log("--- per endpoint ---");
  for (const row of summary.rows) {
    console.log(
      `${row.endpoint.padEnd(22)} total ${String(row.total).padStart(3)}  ok ${String(row.success).padStart(3)}  err ${String(row.errors).padStart(2)}  avail ${String(row.availabilityPct).padStart(5)}%  p50 ${String(row.p50Ms).padStart(5)}ms  p95 ${String(row.p95Ms).padStart(5)}ms  gemini [${row.gemini}]`,
    );
  }
}

async function fetchAdminKey(projectId, token) {
  const list = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const entry = (list.envs ?? []).find((e) => e.key === "ADMIN_API_KEY");
  if (!entry) throw new Error(`ADMIN_API_KEY not found in project ${projectId}`);
  const detail = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${entry.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  if (!detail.value) throw new Error("ADMIN_API_KEY value is empty");
  return detail.value;
}

async function establishSession(base) {
  const res = await fetch(`${base}/api/v1/csrf-token`, {
    credentials: "include",
    headers: { "user-agent": UA },
  });
  if (!res.ok) throw new Error(`csrf-token fetch failed (${res.status})`);
  const { csrfToken } = await res.json();
  if (!csrfToken) throw new Error("no CSRF token in response");
  const cookie = (res.headers.getSetCookie()[0] ?? "").split(";")[0];
  return { csrfToken, cookie };
}

async function probe(base, endpoint, body, session, adminKey) {
  const startedAt = Date.now();
  const res = await fetch(`${base}/api/v1/admin/ai-assistant/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
      "x-csrf-token": session.csrfToken,
      cookie: session.cookie,
      "user-agent": UA,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const durationMs = Date.now() - startedAt;
  const text = await res.text().catch(() => "");
  const classified = classifyResponse(res.status, text, durationMs);
  return { endpoint, ...classified };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const adminKey = process.env.ADMIN_API_KEY ?? (await fetchAdminKey(opts.project, process.env.VERCEL_TOKEN ?? ""));
  const session = await establishSession(opts.base);

  console.log(`[check-gemini-health] probing ${opts.base} for ${opts.duration}s every ${opts.interval}s (4 endpoints/round)`);
  const records = [];
  const startedAt = Date.now();

  const tick = async () => {
    for (const [endpoint, body] of ENDPOINTS) {
      try {
        records.push(await probe(opts.base, endpoint, body, session, adminKey));
      } catch (err) {
        records.push({
          endpoint,
          outcome: "other-error",
          status: 0,
          durationMs: Date.now() - startedAt,
          geminiStatus: null,
          detail: `probe failed: ${err?.message ?? err}`.slice(0, 80),
        });
      }
    }
    const elapsed = Date.now() - startedAt;
    if (elapsed < opts.duration * 1000) {
      setTimeout(tick, opts.interval * 1000);
    } else {
      printSummary(summarize(records));
    }
  };

  process.on("SIGINT", () => {
    console.log("\n[check-gemini-health] interrupted — partial summary:");
    printSummary(summarize(records));
    process.exit(0);
  });

  await tick();
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error(`[check-gemini-health] ${err?.message ?? err}`);
    process.exit(1);
  });
}
