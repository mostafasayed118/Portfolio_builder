import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { AuthContextProvider, type AuthContextValue } from "@workspace/auth";
import Header from "@/components/Header";

const mockAuth: AuthContextValue = {
  user: { id: "test-id", email: "admin@test.com", role: "admin" },
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  isAdmin: true,
};

function Wrapper({ children }: { children: ReactNode }) {
  return <AuthContextProvider value={mockAuth}>{children}</AuthContextProvider>;
}

describe("Header", () => {
  it("renders the page title", () => {
    render(<Header onMenuClick={vi.fn()} />, { wrapper: Wrapper });
    // Default location "/" doesn't match any PATH_LABELS key, so it falls back to "Admin CMS"
    const titles = screen.getAllByText("Admin CMS");
    expect(titles.length).toBeGreaterThanOrEqual(1);
    expect(titles[0]).toBeInTheDocument();
  });

  it("calls onMenuClick when menu button is clicked", async () => {
    const onClick = vi.fn();
    render(<Header onMenuClick={onClick} />, { wrapper: Wrapper });
    const btn = screen.getByLabelText("Toggle sidebar");
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("toggles dark mode when theme button is clicked", () => {
    render(<Header onMenuClick={vi.fn()} />, { wrapper: Wrapper });
    const themeBtn = screen.getByTitle(/switch to (light|dark) mode/i);
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    fireEvent.click(themeBtn);
    expect(html.classList.contains("dark")).toBe(!wasDark);
  });
});
