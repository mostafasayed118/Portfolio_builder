import { type ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import { vi } from "vitest";

/**
 * Render a component in a fresh QueryClient wrapped in the LanguageProvider,
 * the same wrapper the section tests use. Returns the render result so
 * callers can grab `container` when they need to query raw DOM.
 */
export function renderWithProviders(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>{ui}</LanguageProvider>
    </QueryClientProvider>,
  );
}

/**
 * The shared `@/hooks/use-reveal` mock module shape. Reference it lazily so
 * vitest's `vi.mock` hoisting can resolve it:
 *   vi.mock("@/hooks/use-reveal", () => mockUseReveal());
 */
export function mockUseReveal() {
  return { useReveal: vi.fn(() => ({ ref: vi.fn(), revealed: true })) };
}

/** The shared `@/components/SectionLabel` mock module shape. */
export function mockSectionLabel() {
  return { default: ({ children }: any) => <div>{children}</div> };
}

/** The shared `@/components/EmptyState` mock module shape. */
export function mockEmptyState() {
  return {
    default: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
  };
}
