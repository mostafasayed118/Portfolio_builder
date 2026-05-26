import { vi, describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { ContentSkeleton } from "@/components/ContentSkeleton";

describe("ContentSkeleton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const { container } = render(<ContentSkeleton />);
    // Should render skeleton elements (Skeleton renders divs with animate-pulse)
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders multiple skeleton cards and list items", () => {
    const { container } = render(<ContentSkeleton />);

    // 3 card skeletons + 4 list item skeletons = 7 skeleton sections
    const skeletonSections = container.querySelectorAll(".border-border");
    expect(skeletonSections.length).toBe(7); // 3 cards + 4 list items
  });

  it("includes page title skeleton", () => {
    const { container } = render(<ContentSkeleton />);

    // The title row contains Skeleton elements (data-testid="skeleton")
    const skeletonElements = container.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it("renders filter bar skeleton with multiple tab placeholders", () => {
    const { container } = render(<ContentSkeleton />);

    // Filter bar section: elements inside the flex row
    const filterSkeletons = container.querySelectorAll('[data-testid="skeleton"]');
    // Total skeletons: title (2) + button (1) + 3 tabs + 3 cards (3 icons + 3 titles + 3 descriptions) + 4 list items (4 icons + 4 titles + 4 descriptions)
    expect(filterSkeletons.length).toBeGreaterThan(3);
  });
});
