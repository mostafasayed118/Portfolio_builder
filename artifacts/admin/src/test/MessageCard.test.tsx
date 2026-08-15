import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageCard, type Message } from "@/features/messages";

const baseMessage: Message = {
  id: "msg-1",
  name: "John Doe",
  email: "john@example.com",
  message: "Hello, I'd like to discuss a project.",
  created_at: "2026-05-15T10:30:00Z",
};

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString();
}

describe("MessageCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sender name, email, and message text", () => {
    render(
      <MessageCard
        message={baseMessage}
        onReply={vi.fn()}
        onMarkRead={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        formatDate={formatDate}
      />,
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(
      screen.getByText("Hello, I'd like to discuss a project."),
    ).toBeInTheDocument();
  });

  it("shows 'New' badge and unread styling for unread messages", () => {
    render(
      <MessageCard
        message={{ ...baseMessage, status: "unread" }}
        onReply={vi.fn()}
        onMarkRead={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        formatDate={formatDate}
      />,
    );

    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByLabelText("Mark message from John Doe as read")).toBeInTheDocument();
  });

  it("shows 'Archived' badge and dimmed styling for archived messages", () => {
    render(
      <MessageCard
        message={{ ...baseMessage, status: "archived" }}
        onReply={vi.fn()}
        onMarkRead={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        formatDate={formatDate}
      />,
    );

    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("does not show mark-read button for read messages", () => {
    render(
      <MessageCard
        message={{ ...baseMessage, status: "read" }}
        onReply={vi.fn()}
        onMarkRead={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        formatDate={formatDate}
      />,
    );

    expect(
      screen.queryByLabelText("Mark message from John Doe as read"),
    ).not.toBeInTheDocument();
  });

  it("calls onReply when reply button is clicked", async () => {
    const onReply = vi.fn();
    render(
      <MessageCard
        message={baseMessage}
        onReply={onReply}
        onMarkRead={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        formatDate={formatDate}
      />,
    );

    await userEvent.click(screen.getByLabelText("Reply to John Doe"));
    expect(onReply).toHaveBeenCalledWith(baseMessage);
  });

  it("calls onMarkRead when mark-read button is clicked", async () => {
    const onMarkRead = vi.fn();
    render(
      <MessageCard
        message={{ ...baseMessage, status: "unread" }}
        onReply={vi.fn()}
        onMarkRead={onMarkRead}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        formatDate={formatDate}
      />,
    );

    await userEvent.click(
      screen.getByLabelText("Mark message from John Doe as read"),
    );
    expect(onMarkRead).toHaveBeenCalledWith({
      ...baseMessage,
      status: "unread",
    });
  });

  it("calls onArchive when archive button is clicked", async () => {
    const onArchive = vi.fn();
    render(
      <MessageCard
        message={baseMessage}
        onReply={vi.fn()}
        onMarkRead={vi.fn()}
        onArchive={onArchive}
        onUnarchive={vi.fn()}
        formatDate={formatDate}
      />,
    );

    await userEvent.click(
      screen.getByLabelText("Archive message from John Doe"),
    );
    expect(onArchive).toHaveBeenCalledWith(baseMessage);
  });

  it("calls onUnarchive when unarchive button is clicked on an archived message", async () => {
    const onUnarchive = vi.fn();
    render(
      <MessageCard
        message={{ ...baseMessage, status: "archived" }}
        onReply={vi.fn()}
        onMarkRead={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={onUnarchive}
        formatDate={formatDate}
      />,
    );

    expect(
      screen.queryByLabelText("Archive message from John Doe"),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByLabelText("Unarchive message from John Doe"),
    );
    expect(onUnarchive).toHaveBeenCalledWith({
      ...baseMessage,
      status: "archived",
    });
  });

  it("renders all action buttons with correct aria-labels", () => {
    render(
      <MessageCard
        message={{ ...baseMessage, status: "unread" }}
        onReply={vi.fn()}
        onMarkRead={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        formatDate={formatDate}
      />,
    );

    expect(
      screen.getByLabelText("Reply to John Doe"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Mark message from John Doe as read"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Archive message from John Doe"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Unarchive message from John Doe"),
    ).not.toBeInTheDocument();
  });

  it("renders formatted date", () => {
    render(
      <MessageCard
        message={baseMessage}
        onReply={vi.fn()}
        onMarkRead={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        formatDate={formatDate}
      />,
    );

    const expectedDate = new Date("2026-05-15T10:30:00Z").toLocaleDateString();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it("uses mailto link for email", () => {
    render(
      <MessageCard
        message={baseMessage}
        onReply={vi.fn()}
        onMarkRead={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        formatDate={formatDate}
      />,
    );

    const emailLink = screen.getByText("john@example.com");
    expect(emailLink.closest("a")).toHaveAttribute(
      "href",
      "mailto:john@example.com",
    );
  });
});
