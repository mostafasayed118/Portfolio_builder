import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/use-reveal", () => ({
  useReveal: vi.fn(() => ({ ref: vi.fn(), revealed: true })),
}));

import OptimizedImage from "@/components/OptimizedImage";

describe("OptimizedImage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders img with src and alt when priority is true (immediate inView)", () => {
    render(
      <OptimizedImage
        src="https://example.com/photo.jpg"
        alt="A test photo"
        priority
      />,
    );

    const img = screen.getByAltText("A test photo");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", expect.stringContaining("photo.jpg"));
  });

  it("calls onError handler when image fails to load", () => {
    const { container } = render(
      <OptimizedImage
        src="https://example.com/broken.jpg"
        alt="Broken image"
        priority
        fallback="/fallback.png"
      />,
    );

    const img = screen.getByAltText("Broken image");
    // The component has an onError handler
    fireEvent.error(img);

    // The pulse skeleton should still be visible since onLoad never fired
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("applies loading='lazy' by default", () => {
    render(
      <OptimizedImage
        src="https://example.com/photo.jpg"
        alt="Lazy loaded"
        priority
      />,
    );

    const img = screen.getByAltText("Lazy loaded");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("applies loading='eager' when specified", () => {
    render(
      <OptimizedImage
        src="https://example.com/photo.jpg"
        alt="Eager loaded"
        loading="eager"
        priority
      />,
    );

    const img = screen.getByAltText("Eager loaded");
    expect(img).toHaveAttribute("loading", "eager");
  });

  it("sets fetchPriority to 'high' when priority is true", () => {
    render(
      <OptimizedImage
        src="https://example.com/photo.jpg"
        alt="Priority image"
        priority
      />,
    );

    const img = screen.getByAltText("Priority image");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });

  it("sets fetchPriority to 'auto' when not priority", () => {
    // With priority=false and the IntersectionObserver mock (never fires callbacks),
    // the main img won't render. Use loading="eager" to bypass the observer.
    const { container } = render(
      <OptimizedImage
        src="https://example.com/photo.jpg"
        alt="Auto priority"
        loading="eager"
        priority={false}
      />,
    );

    const img = container.querySelector("img[alt='Auto priority']");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("fetchpriority", "auto");
  });

  it("renders a pulse skeleton while image is not loaded", () => {
    const { container } = render(
      <OptimizedImage
        src="https://example.com/photo.jpg"
        alt="Skeleton test"
        priority
      />,
    );

    // The component renders a skeleton div with animate-pulse
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});
