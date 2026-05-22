import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SmartErrorBoundary } from "@/components/SmartError";
import React from "react";

function ThrowingComponent({ message = "Test error" }: { message?: string }) {
  throw new Error(message);
}

describe("SmartErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when no error", () => {
    render(
      <SmartErrorBoundary>
        <div>Child content</div>
      </SmartErrorBoundary>,
    );

    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("shows error UI when error caught", () => {
    render(
      <SmartErrorBoundary>
        <ThrowingComponent message="Something broke" />
      </SmartErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Something broke")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
