import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { ViewingUserProvider, useViewingUser } from "./viewing-user-context";
import { useEntityQuery, useUnreadCountQuery } from "./use-entity-query";

vi.mock("./api-client", () => ({
  api: {
    projects: { list: vi.fn() },
    skills: { list: vi.fn() },
    experience: { list: vi.fn() },
    certifications: { list: vi.fn() },
    messages: {
      list: vi.fn(),
      unreadCount: vi.fn(),
    },
  },
}));

import { api } from "./api-client";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ViewingUserProvider>{children}</ViewingUserProvider>
      </QueryClientProvider>
    );
  };
}

describe("useEntityQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(api.projects.list).mockResolvedValue({
      success: true,
      data: [{ id: "p1", title: "P1" }] as never,
    });
  });

  it("passes undefined (no viewing user) to the fetcher by default", async () => {
    const wrapper = makeWrapper();
    renderHook(
      () =>
        useEntityQuery("projects", (uid) => {
          return api.projects.list(uid ?? undefined) as never;
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(api.projects.list).toHaveBeenCalledWith(undefined);
    });
  });

  it("unwraps the paginated envelope { data, pagination } returned by collection endpoints", async () => {
    vi.mocked(api.projects.list).mockResolvedValue({
      success: true,
      data: {
        data: [{ id: "p1", title: "P1" }],
        pagination: { total: 1, limit: 50, offset: 0, hasMore: false },
      },
    } as never);
    const wrapper = makeWrapper();
    const { result } = renderHook(
      () => useEntityQuery("projects", (uid) => api.projects.list(uid ?? undefined) as never),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: "p1", title: "P1" }]);
    });
  });
});

describe("useUnreadCountQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(api.messages.unreadCount).mockResolvedValue({ success: true, data: 5 });
  });

  it("queries unread count via the api-client", async () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useUnreadCountQuery(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBe(5);
    });
    expect(api.messages.unreadCount).toHaveBeenCalled();
  });
});

describe("useViewingUser default", () => {
  it("returns null by default", () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useViewingUser(), { wrapper });
    expect(result.current.viewingUserId).toBeNull();
  });
});
