import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, render, act } from "@testing-library/react";
import { createRef } from "react";
import { OneTimeHint, type OneTimeHintHandle } from "@/components/OneTimeHint";

function renderHint(storageKey = "hint-key") {
  return render(
    <OneTimeHint storageKey={storageKey} dismissLabel="Dismiss hint">
      <span>Learn the ropes</span>
    </OneTimeHint>,
  );
}

describe("OneTimeHint", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("shows the content on first visit and persists the ✕ dismissal", () => {
    const first = renderHint();
    expect(screen.getByText("Learn the ropes")).toBeInTheDocument();
    expect(localStorage.getItem("hint-key")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss hint" }));
    expect(screen.queryByText("Learn the ropes")).not.toBeInTheDocument();
    expect(localStorage.getItem("hint-key")).toBe("1");
    first.unmount();

    // A fresh mount never shows it again.
    renderHint();
    expect(screen.queryByText("Learn the ropes")).not.toBeInTheDocument();
  });

  it("renders nothing when the storage key is already set", () => {
    localStorage.setItem("hint-key", "1");
    renderHint();
    expect(screen.queryByText("Learn the ropes")).not.toBeInTheDocument();
  });

  it("exposes an imperative dismiss() for auto-dismiss flows", () => {
    const ref = createRef<OneTimeHintHandle>();
    render(
      <OneTimeHint ref={ref} storageKey="hint-key" dismissLabel="Dismiss hint">
        <span>Learn the ropes</span>
      </OneTimeHint>,
    );
    expect(screen.getByText("Learn the ropes")).toBeInTheDocument();

    act(() => ref.current?.dismiss());
    expect(screen.queryByText("Learn the ropes")).not.toBeInTheDocument();
    expect(localStorage.getItem("hint-key")).toBe("1");
  });

  it("still hides in-memory when storage is blocked, but reappears on remount", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    const first = renderHint();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss hint" }));
    // Best-effort persistence: the hint hides even though the write failed.
    expect(screen.queryByText("Learn the ropes")).not.toBeInTheDocument();
    first.unmount();

    // Without persistence it returns on a fresh mount — harmless degradation.
    renderHint();
    expect(screen.getByText("Learn the ropes")).toBeInTheDocument();
  });
});
