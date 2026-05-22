import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

function dispatchKey(overrides: Partial<KeyboardEventInit> & { key: string }) {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...overrides,
  });
  document.dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("registers keydown listener when enabled", () => {
    const spy = vi.spyOn(document, "addEventListener");
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "a", handler }])
    );
    expect(spy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("calls handler on matching key", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "a", handler }])
    );
    dispatchKey({ key: "a" });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("respects ctrl modifier", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "s", ctrl: true, handler }])
    );
    dispatchKey({ key: "s", ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("ignores input/textarea targets (except Escape)", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "a", handler }])
    );
    const input = document.createElement("input");
    document.body.appendChild(input);
    const event = new KeyboardEvent("keydown", {
      key: "a",
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "target", { value: input });
    document.dispatchEvent(event);
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("Escape works in input/textarea", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "Escape", handler }])
    );
    const input = document.createElement("input");
    document.body.appendChild(input);
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "target", { value: input });
    document.dispatchEvent(event);
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(input);
  });

  it("does nothing when disabled", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "a", handler }], false)
    );
    dispatchKey({ key: "a" });
    expect(handler).not.toHaveBeenCalled();
  });
});
