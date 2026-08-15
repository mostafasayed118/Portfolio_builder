import { vi } from "vitest";

/**
 * Shared mocks for the admin route tests.
 *
 * Import this module (e.g. `import { mockAdminKey } from "../helpers"`)
 * before importing `app` so the Supabase + adminAuth mocks registered below
 * are in place before the app's route modules load those dependencies.
 */

/** Shared admin-key used by route tests to authenticate as admin. */
export const mockAdminKey = "test-admin-key";

/** Build the chained Supabase client mock shared across route tests. */
export function makeMockSupabase() {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
  };
}

/** Build the adminAuth middleware mock that accepts the given admin key. */
export function makeAdminAuth(key: string = mockAdminKey) {
  return vi.fn((req: any, res: any, next: () => void) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey === key) {
      (req as Record<string, unknown>).adminEmail = "admin@test.com";
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  });
}

// Register the shared mocks as a side effect of importing this module.
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => makeMockSupabase()),
}));

vi.mock("../middleware/adminAuth", () => ({
  adminAuth: makeAdminAuth(),
}));
