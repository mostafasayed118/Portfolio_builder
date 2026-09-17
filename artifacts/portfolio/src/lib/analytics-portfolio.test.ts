import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabase, maybeSingle, order, eq, limit, select, from } = vi.hoisted(() => ({
  getSupabase: vi.fn(), maybeSingle: vi.fn(), order: vi.fn(), eq: vi.fn(),
  limit: vi.fn(), select: vi.fn(), from: vi.fn(),
}));
vi.mock("@workspace/supabase/client", () => ({ getSupabase }));

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  maybeSingle.mockResolvedValue({ data: { id: "published-portfolio" }, error: null });
  limit.mockReturnValue({ maybeSingle });
  order.mockReturnValue({ limit });
  eq.mockReturnValue({ order });
  select.mockReturnValue({ eq });
  from.mockReturnValue({ select });
  getSupabase.mockReturnValue({ from });
});

describe("resolveDefaultPortfolioId", () => {
  it("shares a cached promise and resolves the first published slug", async () => {
    const { resolveDefaultPortfolioId } = await import("./analytics-portfolio");
    const first = resolveDefaultPortfolioId();
    expect(resolveDefaultPortfolioId()).toBe(first);
    await expect(first).resolves.toBe("published-portfolio");
    expect(from).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("public_portfolios");
    expect(select).toHaveBeenCalledWith("id");
    expect(eq).toHaveBeenCalledWith("is_published", true);
    expect(order).toHaveBeenCalledWith("slug", { ascending: true });
    expect(limit).toHaveBeenCalledWith(1);
  });

  it.each([
    { data: null, error: null },
    { data: { id: 1 }, error: null },
    { data: { id: "published-portfolio" }, error: { message: "denied" } },
  ])("returns null for unavailable results %s", async (result) => {
    maybeSingle.mockResolvedValue(result);
    const { resolveDefaultPortfolioId } = await import("./analytics-portfolio");
    await expect(resolveDefaultPortfolioId()).resolves.toBeNull();
  });

  it("returns cached null offline without querying", async () => {
    getSupabase.mockReturnValue(null);
    const { resolveDefaultPortfolioId } = await import("./analytics-portfolio");
    await expect(resolveDefaultPortfolioId()).resolves.toBeNull();
    await expect(resolveDefaultPortfolioId()).resolves.toBeNull();
    expect(getSupabase).toHaveBeenCalledOnce();
    expect(from).not.toHaveBeenCalled();
  });

  it("silently handles rejected queries", async () => {
    maybeSingle.mockRejectedValue(new Error("offline"));
    const { resolveDefaultPortfolioId } = await import("./analytics-portfolio");
    await expect(resolveDefaultPortfolioId()).resolves.toBeNull();
  });

  it("silently handles client initialization errors", async () => {
    getSupabase.mockImplementation(() => { throw new Error("offline"); });
    const { resolveDefaultPortfolioId } = await import("./analytics-portfolio");
    await expect(resolveDefaultPortfolioId()).resolves.toBeNull();
  });
});
