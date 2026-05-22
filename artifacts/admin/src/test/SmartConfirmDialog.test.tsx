import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";

describe("SmartConfirmDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when not open", () => {
    const { container } = render(
      <SmartConfirmDialog
        state={{
          isOpen: false,
          title: "Test",
          message: "Test message",
          variant: "info",
        }}
        onCancel={vi.fn()}
      />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders dialog when open", () => {
    render(
      <SmartConfirmDialog
        state={{
          isOpen: true,
          title: "Delete Item",
          message: "This cannot be undone.",
          confirmLabel: "Delete",
          cancelLabel: "Cancel",
          variant: "danger",
          onConfirm: vi.fn(),
        }}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("Delete Item")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onConfirm on click", async () => {
    const onConfirm = vi.fn();
    render(
      <SmartConfirmDialog
        state={{
          isOpen: true,
          title: "Confirm",
          message: "Are you sure?",
          confirmLabel: "Yes",
          cancelLabel: "Cancel",
          variant: "info",
          onConfirm,
        }}
        onCancel={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByText("Yes"));
    expect(onConfirm).toHaveBeenCalled();
  });
});
