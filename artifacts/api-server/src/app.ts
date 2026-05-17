import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import v1Router from "./routes/v1";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";
import { generateCsrfToken } from "./middleware/csrf";
import { generalLimiter } from "./middleware/rateLimiter";

const app: Express = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co"],
      connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
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

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    process.env.VITE_SITE_URL ?? "",
    process.env.VITE_ADMIN_URL ?? "",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ].filter(Boolean),
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const csrfHandler = (req: Request, res: Response) => {
  res.json({ csrfToken: generateCsrfToken(req, res) });
};

app.get("/api/csrf-token", csrfHandler);
app.get("/api/v1/csrf-token", csrfHandler);

app.use("/api", generalLimiter);
app.use("/api/v1", generalLimiter);
app.use("/api", router);
app.use("/api/v1", v1Router);
app.use(errorHandler);

export default app;
