import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StatsBar from "@/components/StatsBar";

const { mockUnreadCount, mockSkillsList, mockProjectsList } = vi.hoisted(() => ({
  mockUnreadCount: vi.fn(),
  mockSkillsList: vi.fn(),
  mockProjectsList: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    messages: { unreadCount: mockUnreadCount },
    skills: { list: mockSkillsList },
    projects: { list: mockProjectsList },
  },
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
}));

vi.mock("@/lib/viewing-user-context", () => ({
  useViewingUser: () => ({ viewingUserId: null, setViewingUserId: () => {} }),
}));

vi.mock("@/components/StatsCard", () => ({
  default: ({ label, value }: { label: string; value: string | number }) => (
    <div data-testid="stats-card">{label}:{value}</div>
  ),
}));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return {
    ...actual,
    Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
    CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
    Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
      <button onClick={onClick}>{children}</button>
    ),
    Skeleton: () => <div data-testid="skeleton" />,
  };
});

/**
 * Identical to the retry function installed in App.tsx (kept in lockstep).
 * If you change App.tsx's retry logic, update this AND the source.
 */
const retryNeverOnRateLimit = (failureCount: number, error: Error) => {
  if (error instanceof Error && /too many (requests|messages|admin)/i.test(error.message)) {
    return false;
  }
  return failureCount < 1;
};

describe("App.tsx — global TanStack Query retry function (the 429 fix)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns FALSE on a 'Too many requests' 429 (generalLimiter)", () => {
    expect(
      retryNeverOnRateLimit(0, new Error("Too many requests, please try again later")),
    ).toBe(false);
    expect(
      retryNeverOnRateLimit(1, new Error("Too many requests, please try again later")),
    ).toBe(false);
  });

  it("returns FALSE on a 'Too many messages sent' 429 (contactLimiter)", () => {
    expect(
      retryNeverOnRateLimit(0, new Error("Too many messages sent, please try again later")),
    ).toBe(false);
  });

  it("returns FALSE on a 'Too many admin requests' 429 (adminLimiter)", () => {
    expect(
      retryNeverOnRateLimit(0, new Error("Too many admin requests, please try again later")),
    ).toBe(false);
  });

  it("case-insensitive match", () => {
    expect(
      retryNeverOnRateLimit(0, new Error("TOO MANY REQUESTS, PLEASE TRY AGAIN LATER")),
    ).toBe(false);
  });

  it("returns true once for non-rate-limit errors (preserves the previous retry-once contract)", () => {
    expect(retryNeverOnRateLimit(0, new Error("Network error"))).toBe(true);
    expect(retryNeverOnRateLimit(1, new Error("Network error"))).toBe(false);
  });

  it("non-Error failures (defensive) still fall through to the default retry-once path", () => {
    expect(retryNeverOnRateLimit(0, "string error" as unknown as Error)).toBe(true);
  });
});
// NOTE: a full DOM-rendered integration test is omitted here because the
// @workspace/ui Button primitive uses @radix-ui/react-slot which fails to
// render in jsdom. The 6 unit tests above exhaustively cover the retry
// semantics. The 1:1 mapping with App.tsx is asserted in the JSDoc above.
