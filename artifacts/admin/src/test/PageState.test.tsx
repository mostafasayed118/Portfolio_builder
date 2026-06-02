import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PageState } from "@/components/PageState";
import React from "react";

vi.mock("@/components/ContentSkeleton", () => ({
  ContentSkeleton: () => <div data-testid="content-skeleton">Loading...</div>,
}));

vi.mock("@/components/SmartEmptyState", () => ({
  SmartEmptyState: ({ type, onAction, actionLabel }: { type: string; onAction?: () => void; actionLabel?: string }) => (
    <div data-testid="empty-state">
      <span>Empty: {type}</span>
      {onAction && <button onClick={onAction}>{actionLabel || "Add"}</button>}
    </div>
  ),
}));

vi.mock("@/lib/error-messages", () => ({
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Something went wrong on our end. Please try again.",
}));

describe("PageState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton when isLoading is true", () => {
    render(
      <PageState data={undefined} isLoading={true} error={null} emptyType="projects">
        {(data) => <div>{data.length} items</div>}
      </PageState>,
    );
    expect(screen.getByTestId("content-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/items/)).not.toBeInTheDocument();
  });

  it("shows error state when error is present", () => {
    render(
      <PageState data={undefined} isLoading={false} error={new Error("Database connection failed")} emptyType="projects">
        {(data) => <div>{data.length} items</div>}
      </PageState>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Database connection failed")).toBeInTheDocument();
  });

  it("shows empty state when data is empty array", () => {
    render(
      <PageState data={[]} isLoading={false} error={null} emptyType="projects">
        {(data) => <div>{data.length} items</div>}
      </PageState>,
    );
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("Empty: projects")).toBeInTheDocument();
  });

  it("shows empty state when data is undefined", () => {
    render(
      <PageState data={undefined} isLoading={false} error={null} emptyType="experience">
        {(data) => <div>{data.length} items</div>}
      </PageState>,
    );
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("renders children when data has items", () => {
    const items = [
      { id: "1", name: "Project Alpha" },
      { id: "2", name: "Project Beta" },
    ];

    render(
      <PageState data={items} isLoading={false} error={null} emptyType="projects">
        {(data) => (
          <ul>
            {data.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        )}
      </PageState>,
    );

    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
    expect(screen.queryByTestId("content-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", () => {
    const onRetry = vi.fn();

    render(
      <PageState data={undefined} isLoading={false} error={new Error("Network error")} emptyType="projects" onRetry={onRetry}>
        {(data) => <div>{data.length} items</div>}
      </PageState>,
    );

    const retryButton = screen.getByText("Try Again");
    expect(retryButton).toBeInTheDocument();
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not show retry button when onRetry is not provided", () => {
    render(
      <PageState data={undefined} isLoading={false} error={new Error("Some error")} emptyType="projects">
        {(data) => <div>{data.length} items</div>}
      </PageState>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Try Again")).not.toBeInTheDocument();
  });

  it("passes onAction and actionLabel to SmartEmptyState", () => {
    const onAction = vi.fn();

    render(
      <PageState data={[]} isLoading={false} error={null} emptyType="projects" onAction={onAction} actionLabel="Add Project">
        {(data) => <div>{data.length} items</div>}
      </PageState>,
    );

    const actionButton = screen.getByText("Add Project");
    expect(actionButton).toBeInTheDocument();
    fireEvent.click(actionButton);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
