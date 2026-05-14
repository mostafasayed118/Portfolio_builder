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
