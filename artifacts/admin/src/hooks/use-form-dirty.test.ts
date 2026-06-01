import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormDirty } from "./use-form-dirty";

describe("useFormDirty", () => {
  it("isDirty is false before snapshot is called", () => {
    const { result } = renderHook(() => useFormDirty({ name: "test" }));
    expect(result.current.isDirty).toBe(false);
  });

  it("isDirty is false when current matches snapshot", () => {
    const { result } = renderHook(() => useFormDirty({ name: "test" }));
    act(() => result.current.snapshot({ name: "test" }));
    expect(result.current.isDirty).toBe(false);
  });

  it("isDirty is true when current differs from snapshot", () => {
    const { result, rerender } = renderHook(
      ({ data }) => useFormDirty(data),
      { initialProps: { data: { name: "original" } } },
    );
    act(() => result.current.snapshot({ name: "original" }));
    expect(result.current.isDirty).toBe(false);

    rerender({ data: { name: "changed" } });
    expect(result.current.isDirty).toBe(true);
  });

  it("isDirty resets to false after re-snapshot with new data", () => {
    const { result, rerender } = renderHook(
      ({ data }) => useFormDirty(data),
      { initialProps: { data: { name: "original" } } },
    );
    act(() => result.current.snapshot({ name: "original" }));

    rerender({ data: { name: "changed" } });
    expect(result.current.isDirty).toBe(true);

    // Snapshot with changed data, then trigger a re-render to see updated isDirty
    act(() => result.current.snapshot({ name: "changed" }));
    // Force re-render to pick up the new ref value
    rerender({ data: { name: "changed" } });
    expect(result.current.isDirty).toBe(false);
  });

  it("handles nested object comparison", () => {
    const { result, rerender } = renderHook(
      ({ data }) => useFormDirty(data),
      { initialProps: { data: { nested: { value: 1 } } } },
    );
    act(() => result.current.snapshot({ nested: { value: 1 } }));
    expect(result.current.isDirty).toBe(false);

    rerender({ data: { nested: { value: 2 } } });
    expect(result.current.isDirty).toBe(true);
  });

  it("handles array comparison", () => {
    const { result, rerender } = renderHook(
      ({ data }) => useFormDirty(data),
      { initialProps: { data: { items: [1, 2, 3] } } },
    );
    act(() => result.current.snapshot({ items: [1, 2, 3] }));
    expect(result.current.isDirty).toBe(false);

    rerender({ data: { items: [1, 2, 4] } });
    expect(result.current.isDirty).toBe(true);
  });
});
