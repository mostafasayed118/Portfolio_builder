import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";
import v1Router from "./routes/v1";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";
import { generateCsrfToken } from "./middleware/csrf";
import { generalLimiter } from "./middleware/rateLimiter";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedProtocols = isProduction ? ["https:"] : ["http:", "https:"];
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

const app: Express = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // 'unsafe-inline' kept for now because the SPA bundles inline scripts
      // TODO: migrate to nonce-based CSP for production hardening
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
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
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

const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = [
  ...(isProduction ? [] : ["http://localhost:5173", "http://localhost:5174"]),
  process.env.VITE_SITE_URL,
  process.env.VITE_ADMIN_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
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
