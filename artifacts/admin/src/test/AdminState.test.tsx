import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdminErrorState } from "@/components/AdminErrorState";
import { AdminLoadingState } from "@/components/AdminLoadingState";

describe("AdminLoadingState", () => {
  it("renders the shared list skeleton by default", () => {
    const { container } = render(<AdminLoadingState />);

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it.each(["posts", "audit", "cv"] as const)("supports the %s layout variant", (variant) => {
    const { container } = render(<AdminLoadingState variant={variant} />);

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });
});

describe("AdminErrorState", () => {
  it("renders a friendly error and retries when requested", () => {
    const onRetry = vi.fn();
    render(
      <AdminErrorState
        error={new Error("network error")}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Connection error — check your internet connection")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("supports a custom title and message", () => {
    render(
      <AdminErrorState
        title="Failed to load data"
        message="Please try again later"
      />,
    );

    expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    expect(screen.getByText("Please try again later")).toBeInTheDocument();
  });
});
