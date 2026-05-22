import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Capture the scroll callback for manual invocation
let scrollCallback: (() => void) | null = null;

vi.mock("@/hooks/use-throttled-scroll", () => ({
  useThrottledScroll: (callback: () => void) => {
    scrollCallback = callback;
  },
}));

vi.mock("framer-motion", () => ({
  motion: {
    button: ({ children, initial, animate, exit, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import BackToTop from "@/components/BackToTop";

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    value,
    writable: true,
    configurable: true,
  });
}

describe("BackToTop", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    scrollCallback = null;
    setScrollY(0);
  });

  it("renders nothing initially", () => {
    setScrollY(0);
    render(<BackToTop />);
    expect(screen.queryByRole("button", { name: "Back to top" })).not.toBeInTheDocument();
  });

  it("shows button after scroll past threshold", async () => {
    setScrollY(500);
    const { rerender } = render(<BackToTop />);

    // Trigger the scroll callback manually
    expect(scrollCallback).toBeTruthy();
    scrollCallback!();
    // Force re-render to pick up state change
    rerender(<BackToTop />);

    expect(screen.getByRole("button", { name: "Back to top" })).toBeInTheDocument();
  });

  it("scrolls to top on click", () => {
    setScrollY(500);
    const scrollToSpy = vi.fn();
    window.scrollTo = scrollToSpy as any;

    const { rerender } = render(<BackToTop />);

    scrollCallback!();
    rerender(<BackToTop />);

    const button = screen.getByRole("button", { name: "Back to top" });
    fireEvent.click(button);

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
