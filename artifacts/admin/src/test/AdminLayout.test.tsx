import { fireEvent, render, screen } from "@testing-library/react";
import AdminLayout from "@/components/AdminLayout";

vi.mock("@/components/Sidebar", () => ({
  default: ({ open, collapsed }: { open: boolean; collapsed: boolean }) => (
    <div data-testid="sidebar" data-open={open} data-collapsed={collapsed} />
  ),
}));

vi.mock("@/components/Header", () => ({
  default: ({ onMenuClick }: { onMenuClick: () => void }) => (
    <div data-testid="header">
      <button data-testid="header-toggle" onClick={onMenuClick} />
    </div>
  ),
}));

beforeEach(() => {
  localStorage.clear();
});

describe("AdminLayout", () => {
  it("renders sidebar and header", () => {
    render(<AdminLayout><div>content</div></AdminLayout>);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(<AdminLayout><div>test content</div></AdminLayout>);
    expect(screen.getByText("test content")).toBeInTheDocument();
  });

  it("sidebar starts open", () => {
    render(<AdminLayout><div /></AdminLayout>);
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "true");
  });

  it("toggles the desktop sidebar between expanded and collapsed states", () => {
    render(<AdminLayout><div /></AdminLayout>);
    const sidebar = screen.getByTestId("sidebar");

    expect(sidebar).toHaveAttribute("data-collapsed", "false");
    fireEvent.click(screen.getByTestId("header-toggle"));
    expect(sidebar).toHaveAttribute("data-collapsed", "true");
  });

  it("restores the persisted desktop sidebar state", () => {
    localStorage.setItem("admin-sidebar-collapsed", "1");

    render(<AdminLayout><div /></AdminLayout>);

    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-collapsed", "true");
  });
});
