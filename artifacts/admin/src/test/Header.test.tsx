import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "@/components/Header";

describe("Header", () => {
  it("renders the Admin CMS title", () => {
    render(<Header onMenuClick={vi.fn()} />);
    expect(screen.getByText("Admin CMS")).toBeInTheDocument();
  });

  it("renders the Portfolio Manager subtitle", () => {
    render(<Header onMenuClick={vi.fn()} />);
    expect(screen.getByText("Portfolio Manager")).toBeInTheDocument();
  });

  it("calls onMenuClick when menu button is clicked", async () => {
    const onClick = vi.fn();
    render(<Header onMenuClick={onClick} />);
    const btn = screen.getByLabelText("Toggle sidebar");
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("toggles dark mode when theme button is clicked", () => {
    render(<Header onMenuClick={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "" });
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    fireEvent.click(btn);
    expect(html.classList.contains("dark")).toBe(!wasDark);
  });
});
