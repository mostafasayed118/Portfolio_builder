import { Router, type IRouter } from "express";
import { env } from "../lib/env";

/**
 * GET / HEAD /api/healthz and /api/v1/healthz
 *
 * Liveness check used by Docker, Kubernetes, load balancers, and
 * uptime monitors. Intentionally MINIMAL:
 *
 *   - No database ping (a transient DB blip should NOT trigger a
 *     container restart — that's a readiness-check concern, not a
 *     liveness one).
 *   - No auth (every monitoring tool, including unauthenticated
 *     load-balancer health probes, must be able to call this).
 *   - No rate limiting (monitoring tools hit this on a tight
 *     schedule; throttling them breaks alerting).
 *   - No response cache (the call is cheap enough that caching
 *     adds complexity without buying anything).
 *
 * HEAD is supported because most production health-probe systems
 * (Docker HEALTHCHECK, AWS ALB target group, k8s livenessProbe)
 * default to HEAD. The semantics are the same as GET: 200 if the
 * process is alive, with no body (HEAD must never return a body
 * per RFC 9110 §9.3.2).
 */
const router: IRouter = Router();

function buildHealthPayload() {
  // In production the endpoint is unauthenticated, so it must not disclose
  // process internals (uptime enables uptime-probe fingerprinting; the
  // environment name aids recon). Monitoring only needs the status.
  if (env.NODE_ENV === "production") {
    return { status: "ok" };
  }
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  };
}

router.get("/healthz", (_req, res) => {
  res.status(200).json(buildHealthPayload());
});

router.head("/healthz", (_req, res) => {
  // HEAD must not return a body. Send the same status code GET
  // would return so probe-side logic ("200 = healthy") is uniform
  // across both methods.
  res.status(200).end();
});

export default router;
