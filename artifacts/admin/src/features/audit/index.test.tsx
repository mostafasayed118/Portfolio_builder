import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter, type AuditEntry, type Pagination } from "@workspace/api-client-react";
import AuditLogPage from "@/features/audit";

// Intercept at the FETCH boundary (vi.stubGlobal) so the REAL api-client
// runs end-to-end — only the network is stubbed, per repo testing rules.

let entrySeq = 0;
function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  entrySeq += 1;
  return {
    id: `snap-${entrySeq}`,
    entity_type: "projects",
    entity_id: `entity-${entrySeq}`,
    version: 1,
    data: {},
    changed_by: "tester@example.com",
    created_at: "2026-09-14T10:00:00.000Z",
    ...overrides,
  };
}

function auditResponse(entries: AuditEntry[], pagination: Pagination): Response {
  return new Response(
    JSON.stringify({ success: true, data: { data: entries, pagination } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function buildFetchMock(
  handler: (url: string) => Promise<Response> | Response,
): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/csrf-token")) {
      return new Response(JSON.stringify({ csrfToken: "csrf" }), { status: 200 });
    }
    return handler(url);
  });
}

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <AuditLogPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  entrySeq = 0;
  setAuthTokenGetter(async () => "test-clerk-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
  setAuthTokenGetter(null);
});

describe("AuditLogPage — React Query states", () => {
  it("shows the loading skeleton while the audit request is pending", async () => {
    const fetchMock = buildFetchMock(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
    const skeletons = document.querySelectorAll(
      '[class*="animate-pulse"], [data-slot="skeleton"]',
    );
    expect(skeletons.length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([u]) => String(u).includes("/api/v1/admin/audit")),
      ).toBe(true);
    });
  });

  it("renders the error state with retry when the audit request fails", async () => {
    const fetchMock = buildFetchMock(() =>
      new Response(
        JSON.stringify({ success: false, message: "audit exploded" }),
        { status: 500 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    expect(await screen.findByText("Failed to load audit log")).toBeInTheDocument();
    expect(screen.getByText("audit exploded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders the empty state when there are no audit entries", async () => {
    const fetchMock = buildFetchMock(() =>
      auditResponse([], { total: 0, limit: 25, offset: 0, hasMore: false }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    expect(
      await screen.findByText("No audit log entries found."),
    ).toBeInTheDocument();
    expect(screen.getByText("0 changes")).toBeInTheDocument();
  });

  it("renders entries and the total count from the first page", async () => {
    const entries = [
      makeEntry({ entity_type: "hero_content" }),
      makeEntry({ entity_type: "skills" }),
    ];
    const fetchMock = buildFetchMock(() =>
      auditResponse(entries, { total: 2, limit: 25, offset: 0, hasMore: false }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    expect(await screen.findByText("Audit Log")).toBeInTheDocument();
    expect(screen.getByText("entity-1")).toBeInTheDocument();
    expect(screen.getByText("entity-2")).toBeInTheDocument();
    expect(screen.getByText("2 changes")).toBeInTheDocument();
  });

  it("hides Load more when the response has no more pages", async () => {
    const fetchMock = buildFetchMock(() =>
      auditResponse([makeEntry()], { total: 1, limit: 25, offset: 0, hasMore: false }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    expect(await screen.findByText("entity-1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });
});

describe("AuditLogPage — infinite pagination", () => {
  it("loads the next page on Load more, appends rows, and stops at the end", async () => {
    const page1 = [
      makeEntry({ entity_id: "first-page-row-1" }),
      makeEntry({ entity_id: "first-page-row-2" }),
    ];
    const page2 = [makeEntry({ entity_id: "second-page-row" })];
    const fetchMock = buildFetchMock((url) => {
      if (url.includes("offset=0")) {
        return auditResponse(page1, { total: 3, limit: 25, offset: 0, hasMore: true });
      }
      if (url.includes("offset=2")) {
        return auditResponse(page2, { total: 3, limit: 25, offset: 2, hasMore: false });
      }
      throw new Error("Unexpected audit fetch: " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    expect(await screen.findByText("first-page-row-1")).toBeInTheDocument();
    expect(screen.queryByText("second-page-row")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /load more/i }));

    expect(await screen.findByText("second-page-row")).toBeInTheDocument();
    expect(screen.getByText("first-page-row-1")).toBeInTheDocument();
    expect(screen.getByText("3 changes")).toBeInTheDocument();

    const auditCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes("/api/v1/admin/audit"),
    );
    expect(auditCalls).toHaveLength(2);
    expect(String(auditCalls[1]?.[0])).toContain("offset=2");

    expect(
      screen.queryByRole("button", { name: /load more/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the filter in the query so changing entities refetches from page 1", async () => {
    const fetchMock = buildFetchMock((url) => {
      const offset = url.includes("offset=25") ? 25 : 0;
      const entity = url.includes("entityType=projects") ? "projects" : "all";
      const rows = entity === "projects" ? [makeEntry({ entity_type: "projects", entity_id: "projects-row" })] : [makeEntry({ entity_id: "all-row" })];
      return auditResponse(rows, { total: 1, limit: 25, offset, hasMore: false });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    expect(await screen.findByText("all-row")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "Projects" }));

    expect(await screen.findByText("projects-row")).toBeInTheDocument();
    expect(screen.queryByText("all-row")).not.toBeInTheDocument();
  });
});
