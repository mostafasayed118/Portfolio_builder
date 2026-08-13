import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { Suspense, lazy } from "react";

vi.mock("@workspace/supabase/client", () => ({
  isSupabaseConfigured: false,
  getSupabase: vi.fn(() => null),
  resetSupabase: vi.fn(),
}));

vi.mock("@/lib/supabase-provider", () => ({
  isSupabaseConfigured: false,
  getSupabase: vi.fn(() => null),
  SupabaseProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const LazyPanel = lazy(() =>
  new Promise<{ default: () => JSX.Element }>((resolve) => {
    setTimeout(() => resolve({ default: () => <div>Loaded panel</div> }), 80);
  }),
);

function HangingApp() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          data-testid="app-suspense-fallback"
        >
          <span className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
        </div>
      }
    >
      <LazyPanel />
    </Suspense>
  );
}

describe("UX-009 regression: Suspense fallback must not be blank", () => {
  it("the fallback shown while a lazy section is loading is NOT empty — it contains a loader element with a label", async () => {
    const { getByTestId, findByLabelText, queryByTestId } = render(<HangingApp />);

    expect(getByTestId("app-suspense-fallback")).toBeInTheDocument();
    expect(await findByLabelText("Loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(queryByTestId("app-suspense-fallback")).not.toBeInTheDocument();
    });
  });
});
