import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestRouter } from "@/test/test-router";
import NotFound from "@/pages/not-found";

vi.mock("@workspace/ui", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}));

describe("NotFound page (UX-022 regression: navigation back to home)", () => {
  it("shows the 404 heading and explanatory text", () => {
    render(
      <TestRouter>
        <NotFound />
      </TestRouter>,
    );
    expect(screen.getByText("404 Page Not Found")).toBeInTheDocument();
    expect(screen.getByText(/forget to add the page to the router/i)).toBeInTheDocument();
  });

  it("renders a 'Back to Home' link to '/' (UX-022 regression)", () => {
    render(
      <TestRouter>
        <NotFound />
      </TestRouter>,
    );
    const backLink = screen.getByRole("link", { name: /back to home/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
    expect(backLink).toHaveTextContent(/back to home/i);
  });
});
