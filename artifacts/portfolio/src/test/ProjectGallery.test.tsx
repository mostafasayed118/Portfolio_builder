import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProjectGallery from "@/features/projects/components/ProjectGallery";

// OptimizedImage uses IntersectionObserver — stub it for jsdom.
class MockObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", MockObserver);

const IMAGES = [
  { id: "a", url: "https://img.example.com/a.png" },
  { id: "b", url: "https://img.example.com/b.png" },
];

describe("ProjectGallery", () => {
  it("renders nothing when there are no images and no fallback", () => {
    const { container } = render(<ProjectGallery images={[]} title="P" fallbackUrl={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("uses the fallback cover when no gallery images exist", () => {
    render(<ProjectGallery images={[]} title="P" fallbackUrl="https://img.example.com/cover.png" />);
    expect(screen.getByAltText(/P — screenshot 1/i)).toBeInTheDocument();
  });

  it("renders thumbnails and switches the main image on click", () => {
    render(<ProjectGallery images={IMAGES} title="P" fallbackUrl={null} />);
    expect(screen.getByAltText(/P — screenshot 1/i)).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    fireEvent.click(tabs[1]);
    expect(screen.getByAltText(/P — screenshot 2/i)).toBeInTheDocument();
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
  });
});
