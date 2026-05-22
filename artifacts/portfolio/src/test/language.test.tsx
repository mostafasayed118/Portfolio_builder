import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider, useLanguage } from "@/lib/language";

vi.mock("@/lib/supabase-provider", () => ({
  getSupabase: vi.fn(() => ({})),
  isSupabaseConfigured: true,
}));

const mockFetchLanguageSettings = vi.fn();

vi.mock("@workspace/db/site-settings", () => ({
  fetchLanguageSettings: (...args: unknown[]) =>
    mockFetchLanguageSettings(...args),
}));

function createWrapper(langSettings: Record<string, unknown>) {
  mockFetchLanguageSettings.mockResolvedValue(langSettings);

  return function wrapper({ children }: { children: React.ReactNode }) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return (
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>{children}</LanguageProvider>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("LanguageProvider", () => {
  it("provides default language context with en", async () => {
    const wrapper = createWrapper({
      language_mode: "both",
      show_language_toggle: true,
      default_language: "en",
      rtl_enabled: false,
    });

    const { result } = renderHook(() => useLanguage(), { wrapper });

    await waitFor(() => {
      expect(result.current.langSettings).not.toBeNull();
    });

    expect(result.current.lang).toBe("en");
    expect(result.current.dir).toBe("ltr");
    expect(result.current.isArabic).toBe(false);
  });

  it("toggleLanguage switches en -> ar -> en", async () => {
    const wrapper = createWrapper({
      language_mode: "both",
      show_language_toggle: true,
      default_language: "en",
      rtl_enabled: true,
    });

    const { result } = renderHook(() => useLanguage(), { wrapper });

    await waitFor(() => {
      expect(result.current.langSettings).not.toBeNull();
    });

    act(() => result.current.toggleLanguage());
    expect(result.current.lang).toBe("ar");
    expect(result.current.isArabic).toBe(true);
    expect(result.current.dir).toBe("rtl");

    act(() => result.current.toggleLanguage());
    expect(result.current.lang).toBe("en");
    expect(result.current.isArabic).toBe(false);
    expect(result.current.dir).toBe("ltr");
  });

  it("setLanguage respects en_only mode", async () => {
    const wrapper = createWrapper({
      language_mode: "en_only",
      show_language_toggle: false,
      default_language: "en",
      rtl_enabled: false,
    });

    const { result } = renderHook(() => useLanguage(), { wrapper });

    await waitFor(() => {
      expect(result.current.langSettings).not.toBeNull();
    });

    act(() => result.current.setLanguage("ar"));
    expect(result.current.lang).toBe("en");
  });

  it("setLanguage respects ar_only mode", async () => {
    const wrapper = createWrapper({
      language_mode: "ar_only",
      show_language_toggle: false,
      default_language: "ar",
      rtl_enabled: true,
    });

    const { result } = renderHook(() => useLanguage(), { wrapper });

    await waitFor(() => {
      expect(result.current.langSettings).not.toBeNull();
    });

    act(() => result.current.setLanguage("en"));
    expect(result.current.lang).toBe("ar");
  });
});
