process.env.CSRF_SECRET = "test-secret-for-unit-tests";
process.env.SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

vi.mock("pino-http", () => ({
  default: vi.fn(() => (req: any, res: any, next: () => void) => next()),
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
