import { describe, it, expect, vi } from "vitest";

// vi.hoisted() runs before module imports are evaluated, so this
// stubs import.meta.env.VITE_SUPABASE_URL before storage.ts reads it.
const { url } = vi.hoisted(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  return { url: "https://example.supabase.co" };
});

vi.mock("@workspace/supabase/client", () => ({
  getSupabase: vi.fn(),
  isSupabaseConfigured: false,
}));

import {
  sanitizeFilename,
  isSupabaseStorageUrl,
  extractStoragePath,
} from "./storage";

describe("sanitizeFilename", () => {
  it("lowercases the name", () => {
    expect(sanitizeFilename("MyFile.PDF")).toBe("myfile.pdf");
  });

  it("replaces spaces with hyphens", () => {
    expect(sanitizeFilename("my cool file.png")).toBe("my-cool-file.png");
  });

  it("strips special characters", () => {
    expect(sanitizeFilename("report (final)!@#.pdf")).toBe("report-final.pdf");
  });

  it("collapses multiple dots", () => {
    expect(sanitizeFilename("file..name..txt")).toBe("file.name.txt");
  });

  it("trims leading and trailing hyphens", () => {
    expect(sanitizeFilename("--hello--")).toBe("hello");
  });

  it("handles a complex realistic filename", () => {
    expect(sanitizeFilename("My CV (2024) — FINAL.pdf")).toBe("my-cv-2024--final.pdf");
  });
});

describe("isSupabaseStorageUrl", () => {
  it("returns true for a URL that starts with the storage prefix", () => {
    const storageUrl = `${url}/storage/v1/object/public/bucket/file.png`;
    expect(isSupabaseStorageUrl(storageUrl)).toBe(true);
  });

  it("returns false for an unrelated URL", () => {
    expect(isSupabaseStorageUrl("https://google.com/file.png")).toBe(false);
  });

  it("returns false for a URL that only partially matches", () => {
    expect(isSupabaseStorageUrl(`${url}/auth/v1/callback`)).toBe(false);
  });
});

describe("extractStoragePath", () => {
  it("extracts bucket/path from a valid public storage URL", () => {
    const storageUrl = `${url}/storage/v1/object/public/projects/img.jpg`;
    expect(extractStoragePath(storageUrl)).toBe("projects/img.jpg");
  });

  it("returns null for a non-storage URL", () => {
    expect(extractStoragePath("https://google.com/file.png")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractStoragePath("")).toBeNull();
  });
});
