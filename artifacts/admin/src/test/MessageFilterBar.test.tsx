import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageFilterBar } from "@/components/MessageFilterBar";

describe("MessageFilterBar", () => {
  const defaultProps = {
    filter: "all",
    setFilter: vi.fn(),
    totalCount: 20,
    unreadCount: 5,
    readCount: 10,
    archivedCount: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all four filter tabs", () => {
    render(<MessageFilterBar {...defaultProps} />);

    expect(screen.getByText(/^All \(20\)$/)).toBeInTheDocument();
    expect(screen.getByText(/^Unread \(5\)$/)).toBeInTheDocument();
    expect(screen.getByText(/^Read \(10\)$/)).toBeInTheDocument();
    expect(screen.getByText(/^Archived \(5\)$/)).toBeInTheDocument();
  });

  it("sets correct aria-selected on active tab", () => {
    render(<MessageFilterBar {...defaultProps} filter="unread" />);

    const unreadTab = screen.getByText(/^Unread \(5\)$/).closest("[role='tab']");
    expect(unreadTab).toHaveAttribute("aria-selected", "true");

    const allTab = screen.getByText(/^All \(20\)$/).closest("[role='tab']");
    expect(allTab).toHaveAttribute("aria-selected", "false");
  });

  it("calls setFilter when a tab is clicked", async () => {
    const setFilter = vi.fn();
    render(<MessageFilterBar {...defaultProps} setFilter={setFilter} />);

    await userEvent.click(screen.getByText(/^Unread \(5\)$/));
    expect(setFilter).toHaveBeenCalledWith("unread");
  });

  it("uses tablist role and aria-label", () => {
    render(<MessageFilterBar {...defaultProps} />);

    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveAttribute("aria-label", "Message filters");
  });

  it("renders counts as zero when no messages", () => {
    render(
      <MessageFilterBar
        {...defaultProps}
        totalCount={0}
        unreadCount={0}
        readCount={0}
        archivedCount={0}
      />,
    );

    expect(screen.getByText(/^All \(0\)$/)).toBeInTheDocument();
    expect(screen.getByText(/^Unread \(0\)$/)).toBeInTheDocument();
  });
});
