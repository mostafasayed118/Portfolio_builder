import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBeforeUnload } from "./use-before-unload";

describe("useBeforeUnload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("adds beforeunload listener when condition true", () => {
    const spy = vi.spyOn(window, "addEventListener");
    renderHook(() => useBeforeUnload(true, "Are you sure?"));
    expect(spy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("does not add listener when condition false", () => {
    const spy = vi.spyOn(window, "addEventListener");
    renderHook(() => useBeforeUnload(false, "Are you sure?"));
    expect(spy).not.toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("removes listener on cleanup", () => {
    const spy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useBeforeUnload(true, "Are you sure?"));
    unmount();
    expect(spy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });
});
