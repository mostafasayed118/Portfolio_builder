import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSmartNavigation } from "./useSmartNavigation";

const mockSetLocation = vi.fn();
const mockPrefetch = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/", mockSetLocation],
  useRoute: () => [true, { path: "/" }],
}));

vi.mock("./usePrefetchRoutes", () => ({
  usePrefetch: () => ({ prefetch: mockPrefetch }),
}));

describe("useSmartNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigate calls setLocation", () => {
    const { result } = renderHook(() => useSmartNavigation());
    act(() => {
      result.current.navigate("/projects");
    });
    expect(mockSetLocation).toHaveBeenCalledWith("/projects");
  });

  it("navigate calls prefetch before routing", () => {
    const { result } = renderHook(() => useSmartNavigation());
    act(() => {
      result.current.navigate("/skills");
    });
    expect(mockPrefetch).toHaveBeenCalledWith("/skills");
    expect(mockSetLocation).toHaveBeenCalledWith("/skills");
    // prefetch is called before setLocation
    expect(mockPrefetch.mock.invocationCallOrder[0]).toBeLessThan(
      mockSetLocation.mock.invocationCallOrder[0]
    );
  });

  it("preloadOnHover calls prefetch", () => {
    const { result } = renderHook(() => useSmartNavigation());
    act(() => {
      result.current.preloadOnHover("/about");
    });
    expect(mockPrefetch).toHaveBeenCalledWith("/about");
  });
});
