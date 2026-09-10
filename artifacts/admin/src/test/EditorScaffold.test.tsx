import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EditorHeader, EditorLayout } from "@/components/EditorScaffold";

describe("EditorHeader", () => {
  it("renders the shared title, description, and actions", () => {
    render(
      <EditorHeader
        title="About Editor"
        description="Edit your about section content"
        actions={<button type="button">Save Changes</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "About Editor" })).toBeInTheDocument();
    expect(screen.getByText("Edit your about section content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });
});

describe("EditorLayout", () => {
  it("renders the form and preview in the shared layout", () => {
    render(
      <EditorLayout showPreview={false} onTogglePreview={() => {}} preview={<div>Preview content</div>}>
        <div>Form content</div>
      </EditorLayout>,
    );

    expect(screen.getByText("Form content")).toBeInTheDocument();
    expect(screen.getByText("Preview content")).toBeInTheDocument();
    expect(screen.getByText("Live Preview — updates as you type")).toBeInTheDocument();
  });

  it("renders a mobile toggle that switches the preview on and off", () => {
    const onTogglePreview = vi.fn();
    render(
      <EditorLayout showPreview={false} onTogglePreview={onTogglePreview} preview={<div>Preview content</div>}>
        <div>Form content</div>
      </EditorLayout>,
    );

    const toggle = screen.getByRole("button", { name: "Show preview panel" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(onTogglePreview).toHaveBeenCalledOnce();
  });
});
