import { describe, it, expect, vi, beforeEach } from "vitest";
import { reducer } from "@workspace/ui";

describe("use-toast reducer", () => {
  it("ADD_TOAST adds toast to front", () => {
    const state = { toasts: [] as any[] };
    const result = reducer(state, {
      type: "ADD_TOAST",
      toast: { id: "1", open: true },
    });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe("1");
  });

  it("ADD_TOAST respects TOAST_LIMIT of 1", () => {
    const state = { toasts: [{ id: "existing", open: true }] as any[] };
    const result = reducer(state, {
      type: "ADD_TOAST",
      toast: { id: "2", open: true },
    });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe("2");
  });

  it("UPDATE_TOAST merges partial toast", () => {
    const state = {
      toasts: [{ id: "1", open: true, title: "Old" }] as any[],
    };
    const result = reducer(state, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "New" },
    });
    expect(result.toasts[0].title).toBe("New");
    expect(result.toasts[0].open).toBe(true);
  });

  it("DISMISS_TOAST sets open=false on specific toast", () => {
    const state = {
      toasts: [
        { id: "1", open: true },
        { id: "2", open: true },
      ] as any[],
    };
    const result = reducer(state, {
      type: "DISMISS_TOAST",
      toastId: "1",
    });
    expect(result.toasts.find((t) => t.id === "1")!.open).toBe(false);
    expect(result.toasts.find((t) => t.id === "2")!.open).toBe(true);
  });

  it("DISMISS_TOAST dismisses all when no id", () => {
    const state = {
      toasts: [
        { id: "1", open: true },
        { id: "2", open: true },
      ] as any[],
    };
    const result = reducer(state, { type: "DISMISS_TOAST" });
    expect(result.toasts.every((t) => t.open === false)).toBe(true);
  });

  it("REMOVE_TOAST removes specific toast", () => {
    const state = {
      toasts: [
        { id: "1", open: false },
        { id: "2", open: false },
      ] as any[],
    };
    const result = reducer(state, {
      type: "REMOVE_TOAST",
      toastId: "1",
    });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe("2");
  });

  it("REMOVE_TOAST clears all when no id", () => {
    const state = {
      toasts: [
        { id: "1", open: false },
        { id: "2", open: false },
      ] as any[],
    };
    const result = reducer(state, { type: "REMOVE_TOAST" });
    expect(result.toasts).toHaveLength(0);
  });

  it("UPDATE_TOAST does not modify unrelated toasts", () => {
    const state = {
      toasts: [
        { id: "1", open: true, title: "First" },
        { id: "2", open: true, title: "Second" },
      ] as any[],
    };
    const result = reducer(state, {
      type: "UPDATE_TOAST",
      toast: { id: "2", title: "Updated" },
    });
    expect(result.toasts[0].title).toBe("First");
    expect(result.toasts[1].title).toBe("Updated");
  });
});
