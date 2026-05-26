import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockRefetch = vi.fn().mockResolvedValue({});

// Mock useQuery to return controllable data
const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
}));

vi.mock("@/lib/viewing-user-context", () => ({
  useViewingUser: () => ({ viewingUserId: null }),
}));

import { StatsBar } from "@/components/StatsBar";

function makeQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: mockRefetch,
    ...overrides,
  };
}

describe("StatsBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all queries succeed with data
    mockUseQuery
      .mockReturnValueOnce(makeQueryResult({ data: 5 })) // unread count
      .mockReturnValueOnce(makeQueryResult({ data: [{ id: "s1" }, { id: "s2" }, { id: "s3" }] })) // skills
      .mockReturnValueOnce(makeQueryResult({ data: [{ id: "p1" }, { id: "p2" }] })); // projects
  });

  it("renders loading state with skeleton cards", () => {
    mockUseQuery
      .mockReset()
      .mockReturnValueOnce(makeQueryResult({ isLoading: true }))
      .mockReturnValueOnce(makeQueryResult({ isLoading: true }))
      .mockReturnValueOnce(makeQueryResult({ isLoading: true }));

    const { container } = render(<StatsBar />);

    // Should show skeleton placeholders detected by data-testid
    const skeletonElements = container.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it("renders error state with retry button", () => {
    mockUseQuery
      .mockReset()
      .mockReturnValueOnce(makeQueryResult({ isError: true, error: new Error("Network error") }))
      .mockReturnValueOnce(makeQueryResult({ isError: true, error: new Error("Network error") }))
      .mockReturnValueOnce(makeQueryResult({ isError: true, error: new Error("Network error") }));

    render(<StatsBar />);

    expect(screen.getByText("Failed to load dashboard stats")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("calls refetch on retry", async () => {
    mockUseQuery
      .mockReset()
      .mockReturnValueOnce(makeQueryResult({ isError: true, error: new Error("fail") }))
      .mockReturnValueOnce(makeQueryResult({ isError: true, error: new Error("fail") }))
      .mockReturnValueOnce(makeQueryResult({ isError: true, error: new Error("fail") }));

    render(<StatsBar />);

    await userEvent.click(screen.getByText("Try Again"));
    expect(mockRefetch).toHaveBeenCalledTimes(3);
  });

  it("renders stats cards with correct values", () => {
    render(<StatsBar />);

    expect(screen.getByText("Unread Messages")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("shows seed warning when projects list is empty", () => {
    mockUseQuery
      .mockReset()
      .mockReturnValueOnce(makeQueryResult({ data: 0 })) // unread = 0
      .mockReturnValueOnce(makeQueryResult({ data: [{ id: "s1" }] })) // skills present
      .mockReturnValueOnce(makeQueryResult({ data: [] })); // projects empty

    render(<StatsBar />);

    expect(
      screen.getByText(/No portfolio data found/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Import Static Data/),
    ).toBeInTheDocument();
  });

  it("does not show seed warning when projects exist", () => {
    render(<StatsBar />);

    expect(
      screen.queryByText(/No portfolio data found/),
    ).not.toBeInTheDocument();
  });

  it("renders four stat cards in grid", () => {
    const { container } = render(<StatsBar />);

    const cards = container.querySelectorAll(".grid > div");
    expect(cards.length).toBe(4);
  });
});
