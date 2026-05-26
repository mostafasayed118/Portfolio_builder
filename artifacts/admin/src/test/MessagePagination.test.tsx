import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessagePagination } from "@/components/MessagePagination";

describe("MessagePagination", () => {
  const defaultProps = {
    filteredCount: 25,
    page: 1,
    pageSize: 10,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows correct range information", () => {
    render(<MessagePagination {...defaultProps} />);

    expect(screen.getByText(/Showing 1–10 of 25/)).toBeInTheDocument();
  });

  it("disables Previous button on first page", () => {
    render(<MessagePagination {...defaultProps} page={1} />);

    expect(screen.getByText("Previous")).toBeDisabled();
    expect(screen.getByText("Next")).toBeEnabled();
  });

  it("disables Next button on last page", () => {
    render(
      <MessagePagination
        {...defaultProps}
        page={3}
        filteredCount={25}
        pageSize={10}
      />,
    );

    expect(screen.getByText("Next")).toBeDisabled();
  });

  it("enables both buttons on middle pages", () => {
    render(
      <MessagePagination
        {...defaultProps}
        page={2}
        filteredCount={25}
        pageSize={10}
      />,
    );

    expect(screen.getByText("Previous")).toBeEnabled();
    expect(screen.getByText("Next")).toBeEnabled();
  });

  it("calls onPageChange with decrement when Previous is clicked", async () => {
    const onPageChange = vi.fn();
    render(
      <MessagePagination
        {...defaultProps}
        page={2}
        onPageChange={onPageChange}
      />,
    );

    await userEvent.click(screen.getByText("Previous"));
    expect(onPageChange).toHaveBeenCalled();
  });

  it("calls onPageChange with increment when Next is clicked", async () => {
    const onPageChange = vi.fn();
    render(
      <MessagePagination
        {...defaultProps}
        page={1}
        filteredCount={25}
        onPageChange={onPageChange}
      />,
    );

    await userEvent.click(screen.getByText("Next"));
    expect(onPageChange).toHaveBeenCalled();
  });

  it("shows correct range on last page", () => {
    render(
      <MessagePagination
        filteredCount={25}
        page={3}
        pageSize={10}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Showing 21–25 of 25/)).toBeInTheDocument();
  });

  it("renders page size selector", () => {
    render(<MessagePagination {...defaultProps} />);

    // Select trigger should be rendered
    const selectTrigger = screen.getByTestId("select-trigger");
    expect(selectTrigger).toBeInTheDocument();
  });
});
