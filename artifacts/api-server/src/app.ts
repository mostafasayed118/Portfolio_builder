import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";
import v1Router from "./routes/v1";
import healthRouter from "./routes/health";
import { logger } from "./lib/logger";
import { env } from "./lib/env";
import { errorHandler } from "./middleware/errorHandler";
import { generateCsrfToken } from "./middleware/csrf";
import { generalLimiter } from "./middleware/rateLimiter";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedProtocols = env.IS_PRODUCTION ? ["https:"] : ["http:", "https:"];
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

const app: Express = express();

// The API server runs behind a reverse proxy (Vercel edge and similar PaaS
// proxies). Without `trust proxy`, `req.ip` is the proxy's address for every
// request, which (a) collapses IP-based rate limiting to a single shared IP
// and (b) reduces the CSRF session identifier (`ip + user-agent`) to
// user-agent-only. Trust exactly one proxy hop in production so `req.ip`
// reflects the real client address.
if (env.IS_PRODUCTION) {
  app.set("trust proxy", 1);
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // The SPA bundles are built by Vite as external static assets, so
      // script-src only needs 'self'. If the API server ever serves an
      // HTML page with inline scripts, migrate to nonce-based CSP.
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co"],
      connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      workerSrc: ["'self'"],
      upgradeInsecureRequests: env.IS_PRODUCTION ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = [
  ...(env.IS_PRODUCTION ? [] : ["http://localhost:5173", "http://localhost:5174"]),
  env.VITE_SITE_URL,
  env.VITE_ADMIN_URL,
  env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
].filter((url): url is string => !!url && isValidUrl(url));

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(cookieParser());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Request ID tracking
app.use((req, res, next) => {
  const requestId = (req.headers["x-request-id"] as string) ?? randomUUID();
  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
});

const csrfHandler = (req: Request, res: Response) => {
  res.json({ csrfToken: generateCsrfToken(req, res) });
};

app.get("/api/v1/csrf-token", csrfHandler);

// Health check (GET + HEAD) — mounted at the top-level /api prefix
// BEFORE the v1 rate limiter and BEFORE the v1 router. The route
// itself is unauthenticated, uncached, and does no I/O; it only
// reports process.uptime() and the current timestamp. This is the
// canonical liveness endpoint used by Docker / k8s / load
// balancers.
app.use("/api", healthRouter);

app.use("/api/v1", generalLimiter);
app.use("/api/v1", v1Router);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Not found",
  });
});

app.use(errorHandler);

export default app;
