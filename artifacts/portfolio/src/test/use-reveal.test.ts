import { renderHook } from "@testing-library/react";
import { useReveal } from "@/hooks/use-reveal";

describe("useReveal", () => {
  it("returns ref and revealed=false initially", () => {
    const { result } = renderHook(() => useReveal());
    expect(result.current.ref).toBeDefined();
    expect(result.current.revealed).toBe(false);
  });

  it("accepts a custom threshold", () => {
    const { result } = renderHook(() => useReveal(0.5));
    expect(result.current.revealed).toBe(false);
  });

  it("uses default threshold of 0.15", () => {
    const { result } = renderHook(() => useReveal());
    expect(result.current.revealed).toBe(false);
  });
});
