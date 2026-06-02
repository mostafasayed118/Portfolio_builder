import { Router, type IRouter } from "express";
import { getSupabaseClient } from "../lib/supabase-client";

const router: IRouter = Router();

// In-memory cache for health checks (5-second TTL)
let healthCache: { data: unknown; expiresAt: number } | null = null;

router.get("/healthz", async (_req, res) => {
  const now = Date.now();
  if (healthCache && now < healthCache.expiresAt) {
    const cached = healthCache.data as Record<string, unknown>;
    const status = cached.status === "ok" ? 200 : 503;
    return res.status(status).json(cached);
  }

  const start = Date.now();

  let dbStatus: "ok" | "error" = "ok";
  let dbLatency = 0;

  try {
    const supabase = getSupabaseClient();
    const t = Date.now();
    const { error } = await supabase
      .from("site_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    dbLatency = Date.now() - t;
    if (error) dbStatus = "error";
  } catch {
    dbStatus = "error";
  }

  const overall = dbStatus === "ok" ? "ok" : "degraded";

  const data = {
    status: overall,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: {
      status: dbStatus,
      latency_ms: dbLatency,
    },
    api: {
      status: "ok",
      response_ms: Date.now() - start,
    },
  };

  // Cache for 5 seconds
  healthCache = { data, expiresAt: now + 5000 };

  return res.status(dbStatus === "ok" ? 200 : 503).json(data);
});

/** Clear the health cache — used by tests to reset state between runs */
export function resetHealthCache() {
  healthCache = null;
}

export default router;
