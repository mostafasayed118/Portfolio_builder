import { vi } from "vitest";

/**
 * Creates a mock Supabase client that supports the chained query builder pattern.
 * All query methods return `this` to support chaining; terminal methods return
 * `{ data: null, error: null }` by default.
 *
 * Override individual methods in tests:
 *   const supabase = createMockSupabase();
 *   supabase.select.mockResolvedValue({ data: [{ id: "1" }], error: null });
 */
export function createMockSupabase() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return chain;
}
