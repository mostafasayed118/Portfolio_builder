import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditorCard, EditorField } from "@/components/EditorForm";

describe("EditorCard", () => {
  it("renders a titled card with content and optional actions", () => {
    render(
      <EditorCard title="Identity" headerActions={<button type="button">Add</button>}>
        <span>Form content</span>
      </EditorCard>,
    );

    expect(screen.getByText("Identity")).toBeInTheDocument();
    expect(screen.getByText("Form content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});

describe("EditorField", () => {
  it("renders the label and supplied control", () => {
    render(
      <EditorField label="Name">
        <input aria-label="Name input" />
      </EditorField>,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name input" })).toBeInTheDocument();
  });

  it("renders accessible validation errors and hints", () => {
    const { rerender } = render(
      <EditorField label="Email" htmlFor="email" error="Enter a valid email">
        <input id="email" />
      </EditorField>,
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "email-error");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email");
    expect(screen.getByRole("alert")).toHaveAttribute("id", "email-error");

    rerender(
      <EditorField label="Email" hint="We will never share your email">
        <input />
      </EditorField>,
    );

    expect(screen.getByText("We will never share your email")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("associates the label with the control and marks required fields", () => {
    const { container } = render(
      <EditorField label="Degree" required>
        <input id="degree" />
      </EditorField>,
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(container.querySelector('label[for="degree"]')).not.toBeNull();
    // The asterisk is visual-only and hidden from assistive tech.
    expect(container.querySelector('label span[aria-hidden="true"]')).not.toBeNull();
  });

  it("only references an error/hint when one is rendered", () => {
    const { container } = render(
      <EditorField label="Name">
        <input />
      </EditorField>,
    );

    const input = screen.getByRole("textbox");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(container.querySelector("[role='alert']")).toBeNull();
  });
});
