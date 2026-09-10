import { vi } from "vitest";

export interface SupabaseClientMockOptions {
  /**
   * When provided, the terminal `maybeSingle` calls resolve to
   * `{ data: <value>, error: null }` instead of `undefined`. The portfolio
   * setup passes its hero-content fixture here; the admin setup leaves it
   * unset (plain `vi.fn()`).
   */
  maybeSingleData?: unknown;
  /**
   * When true, the `eq` chain also exposes a `gte` branch. The portfolio
   * data hooks call `.eq(...).gte(...)` date filters; the admin does not.
   */
  includeGte?: boolean;
}

/**
 * Builds the `createClient` factory shared by the admin and portfolio test
 * setups, matching the chained query-builder shape both apps rely on.
 * Return value plugs directly into the `@supabase/supabase-js` mock:
 *
 *   vi.mock("@supabase/supabase-js", () => ({
 *     createClient: makeSupabaseCreateClientMock(),
 *   }));
 */
export function makeSupabaseCreateClientMock(
  options: SupabaseClientMockOptions = {},
) {
  const { maybeSingleData, includeGte = false } = options;

  const maybeSingle =
    maybeSingleData === undefined
      ? vi.fn()
      : vi.fn().mockResolvedValue({ data: maybeSingleData, error: null });

  const eq = vi.fn(() => {
    const result: Record<string, unknown> = {
      order: vi.fn(() => ({
        limit: vi.fn(() => ({ maybeSingle: vi.fn() })),
      })),
      single: vi.fn(),
    };
    if (includeGte) {
      result.gte = vi.fn(() => ({
        order: vi.fn(() => ({ limit: vi.fn(() => ({})) })),
      }));
    }
    return result;
  });

  return vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle,
            single: vi.fn(),
          })),
          maybeSingle: vi.fn(),
        })),
        eq,
        limit: vi.fn(() => ({ maybeSingle })),
        single: vi.fn(),
      })),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
      update: vi.fn(() => ({ eq: vi.fn() })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        createSignedUrl: vi.fn(),
      })),
    },
  }));
}
