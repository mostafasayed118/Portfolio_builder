import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "req.headers['x-admin-key']",
    "res.headers['set-cookie']",
  ],
  ...(env.IS_PRODUCTION
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
