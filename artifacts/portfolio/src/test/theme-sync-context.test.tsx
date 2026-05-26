import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeSyncProvider, useThemeSync } from "@/lib/theme-sync-context";
import { LanguageProvider } from "@/lib/language";
import type { Theme } from "@/lib/theme-types";

const { mockSetTheme } = vi.hoisted(() => ({
  mockSetTheme: vi.fn(),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: vi.fn(() => ({ theme: "light", toggle: vi.fn(), setTheme: mockSetTheme })),
}));

vi.mock("@/lib/branding", () => ({
  useBranding: vi.fn(() => ({ siteName: "Test Portfolio", logoUrl: null })),
}));

vi.mock("@/hooks/use-throttled-scroll", () => ({
  useThrottledScroll: vi.fn(),
}));

vi.mock("@/components/LanguageToggle", () => ({
  LanguageToggle: () => <button aria-label="Toggle language">EN</button>,
}));

import Navbar from "@/components/Navbar";

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeSyncProvider>{children}</ThemeSyncProvider>;
}

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>
        <ThemeSyncProvider>{ui}</ThemeSyncProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mockSetTheme.mockClear();
});

describe("ThemeSyncProvider — useThemeSync hook", () => {
  it("provides default state with isSynced=false, mode=null, previousTheme=null", () => {
    const { result } = renderHook(() => useThemeSync(), { wrapper });
    expect(result.current.isSynced).toBe(false);
    expect(result.current.mode).toBeNull();
    expect(result.current.previousTheme).toBeNull();
    expect(typeof result.current.acknowledge).toBe("function");
    expect(typeof result.current.recordSync).toBe("function");
  });

  it("recordSync sets isSynced=true, mode, and previousTheme", () => {
    const { result } = renderHook(() => useThemeSync(), { wrapper });

    act(() => {
      result.current.recordSync("dark", "light");
    });

    expect(result.current.isSynced).toBe(true);
    expect(result.current.mode).toBe("dark");
    expect(result.current.previousTheme).toBe("light");
  });

  it("recordSync overrides previous values when called multiple times", () => {
    const { result } = renderHook(() => useThemeSync(), { wrapper });

    act(() => {
      result.current.recordSync("dark", "light");
    });

    act(() => {
      result.current.recordSync("light", "dark");
    });

    expect(result.current.isSynced).toBe(true);
    expect(result.current.mode).toBe("light");
    expect(result.current.previousTheme).toBe("dark");
  });

  it("acknowledge sets isSynced back to false, preserves mode and previousTheme", () => {
    const { result } = renderHook(() => useThemeSync(), { wrapper });

    act(() => {
      result.current.recordSync("dark", "light");
    });
    expect(result.current.isSynced).toBe(true);

    act(() => {
      result.current.acknowledge();
    });

    expect(result.current.isSynced).toBe(false);
    // mode and previousTheme are preserved even after acknowledge
    expect(result.current.mode).toBe("dark");
    expect(result.current.previousTheme).toBe("light");
  });

  it("recordSync is callable with light or dark themes", () => {
    const { result } = renderHook(() => useThemeSync(), { wrapper });

    act(() => {
      result.current.recordSync("light", "dark");
    });
    expect(result.current.isSynced).toBe(true);
    expect(result.current.mode).toBe("light");
    expect(result.current.previousTheme).toBe("dark");
  });
});

describe("ThemeSyncProvider — Navbar banner integration", () => {
  it("does not show the banner when isSynced=false (default state)", () => {
    renderWithProviders(<Navbar />);
    expect(screen.queryByText(/Theme set to/)).not.toBeInTheDocument();
    expect(screen.queryByText("Undo")).not.toBeInTheDocument();
    expect(screen.queryByText("Dismiss")).not.toBeInTheDocument();
  });

  it("shows the banner with Dark mode text after recordSync('dark', 'light')", () => {
    // Render a component that calls recordSync on mount
    function Trigger() {
      const { recordSync } = useThemeSync();
      return <button data-testid="sync-trigger" onClick={() => recordSync("dark", "light")}>Sync</button>;
    }

    renderWithProviders(
      <>
        <Trigger />
        <Navbar />
      </>
    );

    // Click the sync trigger
    act(() => {
      screen.getByTestId("sync-trigger").click();
    });

    expect(screen.getByText(/Theme set to/)).toBeInTheDocument();
    expect(screen.getByText(/Dark mode/)).toBeInTheDocument();
    expect(screen.getByText("from site settings")).toBeInTheDocument();
    expect(screen.getByText("Undo")).toBeInTheDocument();
    expect(screen.getByText("Dismiss")).toBeInTheDocument();
  });

  it("shows the banner with Light mode text after recordSync('light', 'dark')", () => {
    function Trigger() {
      const { recordSync } = useThemeSync();
      return <button data-testid="sync-trigger" onClick={() => recordSync("light", "dark")}>Sync</button>;
    }

    renderWithProviders(
      <>
        <Trigger />
        <Navbar />
      </>
    );

    act(() => {
      screen.getByTestId("sync-trigger").click();
    });

    expect(screen.getByText(/Theme set to/)).toBeInTheDocument();
    expect(screen.getByText(/Light mode/)).toBeInTheDocument();
  });

  it("hides the banner after acknowledge is called", () => {
    function Trigger() {
      const { recordSync, acknowledge } = useThemeSync();
      return (
        <div>
          <button data-testid="sync-trigger" onClick={() => recordSync("dark", "light")}>Sync</button>
          <button data-testid="dismiss-trigger" onClick={() => acknowledge()}>Dismiss</button>
        </div>
      );
    }

    renderWithProviders(
      <>
        <Trigger />
        <Navbar />
      </>
    );

    // Show the banner
    act(() => {
      screen.getByTestId("sync-trigger").click();
    });
    expect(screen.getByText("Undo")).toBeInTheDocument();

    // Dismiss the banner
    act(() => {
      screen.getByTestId("dismiss-trigger").click();
    });

    expect(screen.queryByText(/Theme set to/)).not.toBeInTheDocument();
    expect(screen.queryByText("Undo")).not.toBeInTheDocument();
  });

  it("Dismiss button click calls acknowledge and hides the banner", () => {
    function Trigger() {
      const { recordSync } = useThemeSync();
      return <button data-testid="sync-trigger" onClick={() => recordSync("dark", "light")}>Sync</button>;
    }

    renderWithProviders(
      <>
        <Trigger />
        <Navbar />
      </>
    );

    // Show the banner
    act(() => {
      screen.getByTestId("sync-trigger").click();
    });
    expect(screen.getByText("Undo")).toBeInTheDocument();

    // Click the Dismiss button on the banner
    act(() => {
      screen.getByText("Dismiss").click();
    });

    expect(screen.queryByText(/Theme set to/)).not.toBeInTheDocument();
    expect(screen.queryByText("Undo")).not.toBeInTheDocument();
  });

  it("Undo button calls setTheme with the previous theme and sets theme_explicit", () => {
    // Simulating what SupabaseThemeSync does before the banner appears:
    // save the original system-preference theme to sessionStorage so it
    // survives page refreshes.
    sessionStorage.setItem("theme_undo", "light");

    function Trigger() {
      const { recordSync } = useThemeSync();
      return <button data-testid="sync-trigger" onClick={() => recordSync("dark", "light")}>Sync</button>;
    }

    renderWithProviders(
      <>
        <Trigger />
        <Navbar />
      </>
    );

    // Show the banner
    act(() => {
      screen.getByTestId("sync-trigger").click();
    });
    expect(screen.getByText("Undo")).toBeInTheDocument();

    // Sanity — localStorage and sessionStorage before click
    expect(localStorage.getItem("theme_explicit")).toBeNull();
    expect(sessionStorage.getItem("theme_undo")).toBe("light");

    // Click the Undo button on the banner
    act(() => {
      screen.getByText("Undo").click();
    });

    // Should revert to the previous theme ("light")
    expect(mockSetTheme).toHaveBeenCalledWith("light");

    // Should mark the user as having made an explicit choice
    expect(localStorage.getItem("theme_explicit")).toBe("true");

    // Should clean up the stored undo state
    expect(sessionStorage.getItem("theme_undo")).toBeNull();

    // Banner should be hidden
    expect(screen.queryByText(/Theme set to/)).not.toBeInTheDocument();
    expect(screen.queryByText("Undo")).not.toBeInTheDocument();
  });

  it("Undo button falls back to context previousTheme when sessionStorage is empty", () => {
    // Do NOT set sessionStorage — simulate first visit where sessionStorage
    // might be cleared but the context still has previousTheme from recordSync.

    function Trigger() {
      const { recordSync } = useThemeSync();
      return <button data-testid="sync-trigger" onClick={() => recordSync("dark", "light")}>Sync</button>;
    }

    renderWithProviders(
      <>
        <Trigger />
        <Navbar />
      </>
    );

    // Show the banner
    act(() => {
      screen.getByTestId("sync-trigger").click();
    });
    expect(screen.getByText("Undo")).toBeInTheDocument();

    // No theme_undo in sessionStorage
    expect(sessionStorage.getItem("theme_undo")).toBeNull();

    // Click Undo
    act(() => {
      screen.getByText("Undo").click();
    });

    // Falls back to previousTheme from context ("light" was passed as prevTheme)
    expect(mockSetTheme).toHaveBeenCalledWith("light");
    expect(localStorage.getItem("theme_explicit")).toBe("true");
  });
});
