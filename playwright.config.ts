import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "portfolio",
      // Portfolio app (5173): run portfolio specs + the mobile admin smoke.
      // Admin specs target the admin app (5174) and must not run here.
      testIgnore: [/admin-.*\.spec\.ts/, /api-contract\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5173",
      },
    },
    {
      name: "setup",
      // Writes playwright/.auth/admin.json via the real Clerk sign-in when
      // CLERK_TEST_EMAIL / CLERK_TEST_PASSWORD are set (stub otherwise). The
      // admin project depends on it so the session is ready before admin specs.
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5174",
      },
    },
    {
      name: "admin",
      // Admin app (5174): run admin specs. Portfolio specs target the
      // portfolio app (5173) and must not run here.
      testIgnore: [/portfolio-.*\.spec\.ts/, /api-contract\.spec\.ts/],
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5174",
      },
    },
    {
      name: "mobile",
      // Portfolio app at mobile viewport: same scope as the portfolio project,
      // except the live contact submission — the API rate-limits contact
      // POSTs to 5/hour/IP, so that spec runs once per suite (portfolio
      // project only) to avoid self-inflicted 429s.
      testIgnore: [
        /admin-.*\.spec\.ts/,
        /api-contract\.spec\.ts/,
        /portfolio-contact-submit\.spec\.ts/,
      ],
      use: {
        ...devices["Pixel 5"],
        baseURL: "http://localhost:5173",
      },
    },
    {
      name: "api",
      // API-contract tests only, once per run, against the api-server.
      testMatch: /api-contract\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3001",
      },
    },
  ],
});
