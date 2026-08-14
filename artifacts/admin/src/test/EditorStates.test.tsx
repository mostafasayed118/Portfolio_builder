import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EditorErrorState, EditorLoadingState } from "@/components/EditorStates";

describe("EditorLoadingState", () => {
  it("renders the editor title and skeletons", () => {
    const { container } = render(<EditorLoadingState title="Hero Editor" />);

    expect(screen.getByText("Hero Editor")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /preview panel/i })).not.toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});

describe("EditorErrorState", () => {
  it("renders the message and retry action", () => {
    const onRetry = vi.fn();
    render(<EditorErrorState message="Failed to load hero content" onRetry={onRetry} />);

    expect(screen.getByText("Failed to load hero content")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
