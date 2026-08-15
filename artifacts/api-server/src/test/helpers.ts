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

/** Build a storage bucket mock with the given method names (all vi.fn()). */
export function makeMockStorage(methodNames: string[]) {
  const storage: Record<string, any> = { from: vi.fn() };
  for (const name of methodNames) storage[name] = vi.fn();
  // storage.from("cv").download() etc. — from() returns the bucket itself.
  storage.from.mockReturnValue(storage);
  return storage;
}

/**
 * Build a Supabase client mock whose chain is wired up manually via
 * `resetSupabaseClient` (rather than `.mockReturnThis()` at creation), so
 * tests can assert on intermediate calls and queue one-off terminal values.
 */
export function makeMockSupabaseClient(storage?: Record<string, any>) {
  const client: Record<string, any> = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    limit: vi.fn(),
    order: vi.fn(),
  };
  if (storage) client.storage = storage;
  return client;
}

/** Re-wire the base query chain and reset the terminal methods to defaults. */
export function resetSupabaseClient(client: Record<string, any>) {
  client.from.mockReturnValue(client);
  client.select.mockReturnValue(client);
  client.insert.mockReturnValue(client);
  client.update.mockReturnValue(client);
  client.delete.mockReturnValue(client);
  client.eq.mockReturnValue(client);
  client.limit.mockReturnValue(client);
  client.order.mockReturnValue(client);
  // Reset terminal methods completely (clears mockResolvedValueOnce queue).
  client.single.mockReset();
  client.single.mockResolvedValue({ data: null, error: null });
  client.maybeSingle.mockReset();
  client.maybeSingle.mockResolvedValue({ data: null, error: null });
}

/**
 * Shared manual-chaining client for cv/images/settings-error route tests.
 * Vitest isolates module registries per test file, so each file importing
 * this helper gets its own copy — call `resetSupabaseClient` in beforeEach.
 */
export const mockSupabaseClient = makeMockSupabaseClient(
  makeMockStorage(["upload", "download", "remove", "getPublicUrl"]),
);

// Register the shared mocks as a side effect of importing this module.
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => makeMockSupabase()),
}));

vi.mock("../middleware/adminAuth", () => ({
  adminAuth: makeAdminAuth(),
}));
