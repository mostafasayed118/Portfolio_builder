process.env.CSRF_SECRET = "test-secret-for-unit-tests";
process.env.SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

vi.mock("pino-http", () => ({
  default: vi.fn(() => (req: any, res: any, next: () => void) => {
    // Add req.log so routes can call req.log.warn(), req.log.error() etc.
    req.log = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(() => req.log),
    };
    next();
  }),
}));

vi.mock("../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
    level: "silent",
  },
}));

vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(),
  createClerkClient: vi.fn(() => ({
    users: { getUser: vi.fn() },
  })),
}));

vi.mock("../middleware/csrf", () => ({
  generateCsrfToken: vi.fn(() => "test-csrf-token"),
  doubleCsrfProtection: vi.fn((_req, _res, next: () => void) => next()),
}));

vi.mock("../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));
