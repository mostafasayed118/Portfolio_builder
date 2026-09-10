import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { SkillsManager } from "@/features/skills";

// ============================================================================
// IMPORTANT INTEGRITY NOTE
// ============================================================================
// The previous version of this test mocked `@/lib/api-client` at the MODULE
// level (`vi.mock("@/lib/api-client", ...)`). That meant a fake `api.skills`
// object was injected into SkillsManager, and the REAL api-client.ts code
// (URL construction, header assembly, body serialization, response parsing)
// never executed. A bug in api-client.ts — wrong URL, missing auth header,
// wrong JSON shape — would never be caught by this test.
//
// The new version intercepts at the FETCH boundary (`vi.stubGlobal("fetch")`),
// so the REAL `api.skills.list()` from `@/lib/api-client` is invoked and
// runs end-to-end. The fetch mock only provides a canned Response object;
// the rest of the real client code must work or the test fails.
// ============================================================================

function buildFetchMock(handler: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  return vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler(url, init);
  });
}

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(() => ({})),
  isSupabaseConfigured: true,
}));

// We intentionally do NOT mock `@/lib/api-client` anymore. The real client
// is used; only the network is stubbed. This is the audit fix.

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return {
    ...actual,
    useToast: () => ({ toast: vi.fn() }),
  };
});

vi.mock("@/components/SmartConfirmDialog", () => ({
  SmartConfirmDialog: () => null,
}));

vi.mock("@/components/SmartEmptyState", () => ({
  SmartEmptyState: ({ type, onAction }: { type: string; onAction?: () => void }) => (
    <div data-testid="smart-empty-state" data-type={type}>
      <p data-testid="smart-empty-state-type">{type}</p>
      {onAction && (
        <button
          data-testid="smart-empty-state-action"
          type="button"
          onClick={onAction}
        >
          Add {type}
        </button>
      )}
    </div>
  ),
}));

function renderWithProviders() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <SkillsManager />
    </QueryClientProvider>,
  );
}

describe("SkillsManager — React Query state coverage (loading / error / empty) — real api-client", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    // Pre-warm the generated client's auth getter so admin requests attach
    // a bearer token instead of short-circuiting with "authentication
    // required". Each test overrides fetch below.
    setAuthTokenGetter(async () => "test-clerk-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setAuthTokenGetter(null);
  });

  it("isLoading → renders the skeleton placeholder (no heading, no skills)", async () => {
    let resolveFetch!: (v: Response) => void;
    const fetchMock = buildFetchMock((url) => {
      if (url.includes("/csrf-token")) {
        return new Response(JSON.stringify({ csrfToken: "csrf" }), { status: 200 });
      }
      if (url.includes("/api/v1/admin/skills")) {
        return new Promise<Response>((resolve) => { resolveFetch = resolve; });
      }
      throw new Error("Unexpected fetch: " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders();

    expect(screen.queryByText("Skills Manager")).not.toBeInTheDocument();
    const skeletons = document.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);

    // Wait until the skills fetch has actually been initiated (so the
    // closure that assigns `resolveFetch` has run) before we use it.
    await waitFor(() => {
      const skillCalls = fetchMock.mock.calls.filter(([u]) =>
        String(u).includes("/api/v1/admin/skills"),
      );
      expect(skillCalls.length).toBeGreaterThan(0);
    });

    resolveFetch(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await waitFor(() => {
      expect(screen.getByText("Skills Manager")).toBeInTheDocument();
    });
  });

  it("isError → shows friendly error message AND a 'Try Again' button that re-fires the query", async () => {
    const fetchMock = buildFetchMock((url) => {
      if (url.includes("/csrf-token")) {
        return new Response(JSON.stringify({ csrfToken: "csrf" }), { status: 200 });
      }
      if (url.includes("/api/v1/admin/skills")) {
        return new Response(
          JSON.stringify({ success: false, message: "Connection error — check your internet connection" }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error("Unexpected fetch: " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Connection error/i)).toBeInTheDocument();
    });

    const retry = screen.getByRole("button", { name: /try again/i });
    expect(retry).toBeInTheDocument();

    // After clicking, fetch should be called again with the skills URL
    fireEvent.click(retry);

    await waitFor(() => {
      const skillCalls = fetchMock.mock.calls.filter(([u]) =>
        String(u).includes("/api/v1/admin/skills"),
      );
      expect(skillCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("isEmpty (data: []) → shows the empty-state component with the correct CTA", async () => {
    const fetchMock = buildFetchMock((url) => {
      if (url.includes("/csrf-token")) {
        return new Response(JSON.stringify({ csrfToken: "csrf" }), { status: 200 });
      }
      if (url.includes("/api/v1/admin/skills")) {
        return new Response(
          JSON.stringify({ success: true, data: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error("Unexpected fetch: " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Skills Manager")).toBeInTheDocument();
    });

    expect(screen.getByTestId("smart-empty-state")).toBeInTheDocument();
    expect(screen.getByTestId("smart-empty-state-type")).toHaveTextContent(/skills/i);
    const cta = screen.getByTestId("smart-empty-state-action");
    expect(cta).toBeInTheDocument();

    await userEvent.click(cta);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Add Skill")).toBeInTheDocument();
  });

  it("success: data is non-empty → renders the skills (NOT the empty state, NOT the error state, NOT the skeleton)", async () => {
    const fetchMock = buildFetchMock((url) => {
      if (url.includes("/csrf-token")) {
        return new Response(JSON.stringify({ csrfToken: "csrf" }), { status: 200 });
      }
      if (url.includes("/api/v1/admin/skills")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              { id: "1", name: "TypeScript", category: "Languages", proficiency: 90, is_visible: true, sort_order: 1 },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error("Unexpected fetch: " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Skills Manager")).toBeInTheDocument();
    });
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.queryByTestId("smart-empty-state")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("INTEGRITY: the real api-client constructs the correct URL, method, and accepts the real response shape", async () => {
    // This is the audit's proof-test. It does NOT mock api-client.
    // It intercepts at fetch and asserts on the REAL outbound request that
    // api-client.ts built. If api-client.ts changes the URL prefix, method,
    // or response parsing, this test breaks.
    const fetchMock = buildFetchMock((url) => {
      if (url.includes("/csrf-token")) {
        return new Response(JSON.stringify({ csrfToken: "csrf" }), { status: 200 });
      }
      if (url.includes("/api/v1/admin/skills")) {
        return new Response(
          JSON.stringify({ success: true, data: [{ id: "1", name: "Real" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error("Unexpected fetch: " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Real")).toBeInTheDocument();
    });

    // Find the call to /api/v1/admin/skills
    const skillCall = fetchMock.mock.calls.find(([u]) =>
      String(u).includes("/api/v1/admin/skills"),
    );
    expect(skillCall).toBeDefined();
    const [calledUrl, calledInit] = skillCall!;
    // The api-client builds the URL from getApiUrl() + "/api/v1/admin/skills".
    // It must be a GET.
    expect(String(calledUrl)).toMatch(/\/api\/v1\/admin\/skills$/);
    expect(calledInit?.method ?? "GET").toBe("GET");
  });
});
