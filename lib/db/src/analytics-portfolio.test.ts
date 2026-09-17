import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { trackEvent } from "./analytics";

describe("trackEvent portfolio ownership", () => {
  it.each(["11111111-1111-4111-8111-111111111111", null, undefined])("inserts portfolio_id for %s", async (portfolioId) => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = createClient("http://localhost:54321", "test-key");
    Object.assign(client, { from: vi.fn().mockReturnValue({ insert }) });
    await trackEvent(client, "page_view", "/", undefined, portfolioId);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ portfolio_id: portfolioId ?? null }));
  });
});
