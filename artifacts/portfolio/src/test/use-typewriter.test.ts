import { renderHook } from "@testing-library/react";
import { useTypewriter } from "@/hooks/use-typewriter";

describe("useTypewriter", () => {
  const texts = ["Data Engineer", "Python Dev"];

  it("returns a string", () => {
    const { result } = renderHook(() => useTypewriter(texts));
    expect(typeof result.current).toBe("string");
  });

  it("starts with empty string", () => {
    const { result } = renderHook(() => useTypewriter(texts));
    expect(result.current).toBe("");
  });
});
