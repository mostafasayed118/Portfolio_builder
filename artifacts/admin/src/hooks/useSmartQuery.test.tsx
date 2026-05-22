import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockRefetch = vi.fn().mockResolvedValue({ data: "refetched" });
const mockUseQuery = vi.fn((_options?: unknown) => ({
  data: "test-data" as unknown,
  isLoading: false,
  isError: false,
  error: null as Error | null,
  refetch: mockRefetch,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

import { useSmartQuery, useSmartMutation } from "./useSmartQuery";

describe("useSmartQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: "test-data" as unknown,
      isLoading: false,
      isError: false,
      error: null as Error | null,
      refetch: mockRefetch,
    });
  });

  it("wraps useQuery and returns data/isLoading/isError", () => {
    const { result } = renderHook(() =>
      useSmartQuery({
        queryKey: ["test"],
        queryFn: vi.fn().mockResolvedValue("test-data"),
      })
    );
    expect(result.current.data).toBe("test-data");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("retry calls refetch", async () => {
    const { result } = renderHook(() =>
      useSmartQuery({
        queryKey: ["test"],
        queryFn: vi.fn().mockResolvedValue("data"),
      })
    );
    await act(async () => {
      await result.current.retry();
    });
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("returns error from useQuery", () => {
    mockUseQuery.mockReturnValueOnce({
      data: undefined as unknown,
      isLoading: false,
      isError: true,
      error: new Error("fetch failed") as Error | null,
      refetch: mockRefetch,
    });
    const { result } = renderHook(() =>
      useSmartQuery({
        queryKey: ["test"],
        queryFn: vi.fn().mockRejectedValue(new Error("fetch failed")),
      })
    );
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("fetch failed");
  });
});

describe("useSmartMutation", () => {
  it("calls mutationFn and onSuccess", async () => {
    const mutationFn = vi.fn().mockResolvedValue("result");
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useSmartMutation(mutationFn, { onSuccess })
    );

    await act(async () => {
      const res = await result.current.mutate("input");
      expect(res).toBe("result");
    });

    expect(mutationFn).toHaveBeenCalledWith("input");
    expect(onSuccess).toHaveBeenCalledWith("result");
  });
});
