import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import MarkdownEditor from "@/features/posts/components/MarkdownEditor";

function TestEditor({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <MarkdownEditor value={value} onChange={setValue} maxLength={200} />;
}

describe("MarkdownEditor", () => {
  it("edits Markdown and shows the character count", () => {
    render(<TestEditor />);
    const input = screen.getByTestId("markdown-input");

    fireEvent.change(input, { target: { value: "## Hello" } });

    expect(input).toHaveValue("## Hello");
    expect(screen.getByText("8 / 200")).toBeInTheDocument();
  });

  it("renders formatted Markdown in preview mode", () => {
    render(<TestEditor initial={"## Hello\n\n**World**"} />);

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByTestId("markdown-preview")).toHaveTextContent("Hello");
    expect(screen.getByTestId("markdown-preview").querySelector("h2")).not.toBeNull();
    expect(screen.getByTestId("markdown-preview").querySelector("strong")).not.toBeNull();
    expect(screen.queryByTestId("markdown-input")).not.toBeInTheDocument();
  });

  it("inserts formatting around selected text", () => {
    render(<TestEditor initial="Hello" />);
    const input = screen.getByTestId("markdown-input") as HTMLTextAreaElement;
    input.focus();
    input.setSelectionRange(0, 5);

    fireEvent.click(screen.getByRole("button", { name: "Bold" }));

    expect(input).toHaveValue("**Hello**");
  });
});
