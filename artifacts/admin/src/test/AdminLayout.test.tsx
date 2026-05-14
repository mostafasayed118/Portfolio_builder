import { render, screen } from "@testing-library/react";
import AdminLayout from "@/components/AdminLayout";

vi.mock("@/components/Sidebar", () => ({
  default: ({ open }: { open: boolean }) => <div data-testid="sidebar" data-open={open} />,
}));

vi.mock("@/components/Header", () => ({
  default: ({ onMenuClick }: { onMenuClick: () => void }) => <div data-testid="header" />,
}));

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
});
