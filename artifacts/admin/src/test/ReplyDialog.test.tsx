import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReplyDialog } from "@/components/ReplyDialog";
import type { Message } from "@/components/MessageCard";

const sampleMessage: Message = {
  id: "msg-1",
  name: "Jane Smith",
  email: "jane@example.com",
  message: "I'm interested in your services.",
  created_at: "2026-05-20T14:00:00Z",
};

describe("ReplyDialog", () => {
  const defaultProps = {
    replyTo: null,
    subject: "",
    body: "",
    onSubjectChange: vi.fn(),
    onBodyChange: vi.fn(),
    onSend: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render dialog when replyTo is null", () => {
    const { container } = render(<ReplyDialog {...defaultProps} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders dialog when replyTo is set", () => {
    render(
      <ReplyDialog
        {...defaultProps}
        replyTo={sampleMessage}
      />,
    );

    expect(screen.getByText("Reply via email")).toBeInTheDocument();
    expect(
      screen.getByText("Draft a reply and open your email client."),
    ).toBeInTheDocument();
  });

  it("displays the recipient email", () => {
    render(
      <ReplyDialog
        {...defaultProps}
        replyTo={sampleMessage}
      />,
    );

    const emailInput = screen.getByDisplayValue("jane@example.com");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("readonly");
  });

  it("renders subject and message inputs", () => {
    render(
      <ReplyDialog
        {...defaultProps}
        replyTo={sampleMessage}
        subject="Re: Your message"
        body="Thanks for reaching out!"
      />,
    );

    const subjectInput = screen.getByDisplayValue("Re: Your message");
    expect(subjectInput).toBeInTheDocument();

    const bodyTextarea = screen.getByDisplayValue("Thanks for reaching out!");
    expect(bodyTextarea).toBeInTheDocument();
  });

  it("calls onSubjectChange when subject is edited", async () => {
    const onSubjectChange = vi.fn();
    render(
      <ReplyDialog
        {...defaultProps}
        replyTo={sampleMessage}
        subject=""
        body="Existing body text to avoid ambiguity"
        onSubjectChange={onSubjectChange}
      />,
    );

    // Pass a non-empty body so getByDisplayValue("") uniquely matches the subject input
    const subjectInput = screen.getByDisplayValue("");
    await userEvent.type(subjectInput, "N");
    expect(onSubjectChange).toHaveBeenCalled();
  });

  it("calls onBodyChange when message body is edited", async () => {
    const onBodyChange = vi.fn();
    render(
      <ReplyDialog
        {...defaultProps}
        replyTo={sampleMessage}
        subject="Pre-filled subject"
        body=""
        onBodyChange={onBodyChange}
      />,
    );

    // Pass a non-empty subject so getByDisplayValue("") uniquely matches the message textarea
    const bodyTextarea = screen.getByDisplayValue("");
    await userEvent.type(bodyTextarea, "H");
    expect(onBodyChange).toHaveBeenCalled();
  });

  it("renders Cancel and Open Email buttons", () => {
    render(
      <ReplyDialog
        {...defaultProps}
        replyTo={sampleMessage}
      />,
    );

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Open Email")).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = vi.fn();
    render(
      <ReplyDialog
        {...defaultProps}
        replyTo={sampleMessage}
        onClose={onClose}
      />,
    );

    await userEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onSend when Open Email is clicked", async () => {
    const onSend = vi.fn();
    render(
      <ReplyDialog
        {...defaultProps}
        replyTo={sampleMessage}
        onSend={onSend}
      />,
    );

    await userEvent.click(screen.getByText("Open Email"));
    expect(onSend).toHaveBeenCalled();
  });
});
