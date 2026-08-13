import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/lib/theme";

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? prefersDark : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ThemeProvider — system preference detection", () => {
  it("defaults to light when no stored preference and OS prefers light", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("light");
  });

  it("defaults to dark when no stored preference and OS prefers dark", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("dark");
  });
});

describe("ThemeProvider — manual toggle", () => {
  it("toggle() flips light → dark → light", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.toggle());
    expect(result.current.theme).toBe("dark");
    act(() => result.current.toggle());
    expect(result.current.theme).toBe("light");
  });

  it("setTheme('dark') bypasses toggle and forces dark even when OS prefers light", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setTheme("dark"));
    expect(result.current.theme).toBe("dark");
  });
});

describe("ThemeProvider — localStorage persistence", () => {
  it("a stored 'dark' value wins over system preference (light)", () => {
    mockMatchMedia(false);
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("dark");
  });

  it("a stored 'light' value wins over system preference (dark)", () => {
    mockMatchMedia(true);
    localStorage.setItem("theme", "light");
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("light");
  });

  it("toggle persists the new value to localStorage", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.toggle());
    expect(localStorage.getItem("theme")).toBe("dark");

    act(() => result.current.toggle());
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("setTheme persists the value to localStorage", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setTheme("dark"));
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});

describe("ThemeProvider — DOM side effects", () => {
  it("toggles the 'dark' class on <html> when theme changes", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    act(() => result.current.toggle());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    act(() => result.current.toggle());
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
