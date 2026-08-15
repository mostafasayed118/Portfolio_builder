import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

// ─── Deployment-time env guard ────────────────────────────────────────────────
//
// Fail the production build when the SPA origins the API must trust are
// missing. The API uses VITE_SITE_URL (portfolio) and VITE_ADMIN_URL (admin)
// for its CORS allowlist, contact-notification links, and the CV QR code; a
// production deploy without them silently degrades those features and opens
// CORS gaps. Vercel sets VERCEL_ENV=production only for production deploys;
// NODE_ENV=production is treated as equivalent for non-Vercel hosts.
//
// Local/dev builds are intentionally not enforced: the server falls back to
// localhost origins in development, so a partial local .env must not block
// `pnpm dev` or `pnpm build` on a laptop.
const IS_PRODUCTION_DEPLOY =
  process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

if (IS_PRODUCTION_DEPLOY) {
  const requiredVars = ["VITE_SITE_URL", "VITE_ADMIN_URL", "CLERK_SECRET_KEY"];
  const missing = requiredVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `[build] Production build blocked: missing required environment variable(s): ${missing.join(", ")}`,
    );
    console.error(
      "[build] Set these in the Vercel project settings (Production environment) and redeploy:",
    );
    for (const key of missing) {
      console.error(`  - ${key}`);
    }
    process.exit(1);
  }

  // Live-validate the Clerk secret key against Clerk's Backend API before
  // shipping. A stale or rotated key (exactly the failure that broke admin
  // auth in production before) would otherwise deploy fine and only fail at
  // runtime with "The provided Clerk Secret Key is invalid". Failing the
  // build here makes that impossible: no deploy ships with a dead key.
  await validateClerkSecretKey();
}

/**
 * Checks the production CLERK_SECRET_KEY against Clerk's Backend API.
 *
 * `GET /v1/instance` is the lightest authenticated endpoint: it returns 200
 * for any valid secret key and 401 for a missing, stale, or forged one.
 * Fail-closed — a production build must never ship a key we cannot verify,
 * and Vercel build runners have reliable network access to api.clerk.com.
 */
async function validateClerkSecretKey() {
  const key = process.env.CLERK_SECRET_KEY;
  let res;
  try {
    res = await fetch("https://api.clerk.com/v1/instance", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error(
      `[build] Production build blocked: could not reach Clerk to validate CLERK_SECRET_KEY (${err?.message ?? err}).`,
    );
    console.error(
      "[build] This is likely a transient build-network issue — retry the deploy. If it persists, verify the key's instance is reachable.",
    );
    process.exit(1);
  }
  if (!res.ok) {
    console.error(
      `[build] Production build blocked: CLERK_SECRET_KEY in the Vercel environment is invalid (Clerk responded ${res.status}).`,
    );
    console.error(
      "[build] The deployed API would reject every admin JWT at runtime. Rotate the key in the Vercel project settings (Production environment) and redeploy.",
    );
    process.exit(1);
  }
  console.log("[build] CLERK_SECRET_KEY validated against Clerk OK");
}

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
