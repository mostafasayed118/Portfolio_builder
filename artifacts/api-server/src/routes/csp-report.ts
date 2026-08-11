import { Router, type IRouter, type Request, type Response } from "express";


/**
 * POST /api/v1/csp-report
 *
 * Receives Content Security Policy violation reports from the browser.
 * The report arrives as a JSON payload with the shape
 *   { "csp-report": { "document-uri": "...", "violated-directive": "...", ... } }
 * (old spec) or
 *   { "type": "csp-violation", "url": "...", "violated-directive": "...", ... }
 * (new Reporting API).
 *
 * This endpoint is intentionally unauthenticated — browsers send reports
 * without credentials. Rate-limited via the global `generalLimiter` (set
 * in app.ts). The body is logged at WARN level (we want to see them)
 * and the response is 204 so the browser stops retrying.
 */
const router: IRouter = Router();

router.post(
  "/csp-report",
  (req: Request, res: Response): void => {
    // Defensive: body might be missing or wrong type.
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== "object") {
      res.status(204).end();
      return;
    }

    // Try the new Reporting API shape first, fall back to the old one.
    const newShape = body as {
      type?: string;
      url?: string;
      violatedDirective?: string;
      effectiveDirective?: string;
      originalPolicy?: string;
      blockedURI?: string;
      lineNumber?: number;
      columnNumber?: number;
      sourceFile?: string;
    };
    const oldShape = (body["csp-report"] ?? {}) as {
      "document-uri"?: string;
      "violated-directive"?: string;
      "blocked-uri"?: string;
      "line-number"?: number;
      "source-file"?: string;
    };

    const url = newShape.url ?? oldShape["document-uri"] ?? "unknown";
    const directive =
      newShape.violatedDirective ??
      newShape.effectiveDirective ??
      oldShape["violated-directive"] ??
      "unknown";
    const blocked = newShape.blockedURI ?? oldShape["blocked-uri"];
    const line = newShape.lineNumber ?? oldShape["line-number"];
    const source = newShape.sourceFile ?? oldShape["source-file"];

    req.log.warn(
      {
        cspViolation: {
          url,
          directive,
          blocked,
          line,
          source,
          userAgent: req.headers["user-agent"],
          ip: req.ip,
        },
      },
      "CSP violation reported",
    );

    // 204 No Content — browsers stop retrying on success.
    res.status(204).end();
  },
);

export default router;
