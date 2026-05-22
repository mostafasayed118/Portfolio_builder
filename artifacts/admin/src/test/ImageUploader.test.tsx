import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ImageUploader from "@/components/ImageUploader";

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return {
    ...actual,
    useToast: () => ({ toast: vi.fn() }),
  };
});

describe("ImageUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload area", () => {
    render(<ImageUploader entityType="project" />);

    expect(screen.getByText("Drop images here or click to browse")).toBeInTheDocument();
    expect(screen.getByText("Drop images here or click to browse")).toBeInTheDocument();
    expect(screen.getByText(/JPEG, PNG, WEBP/)).toBeInTheDocument();
  });

  it("shows existing images", () => {
    const existing = [
      { id: "img1", url: "https://example.com/img1.jpg" },
      { id: "img2", url: "https://example.com/img2.jpg" },
    ];

    render(<ImageUploader entityType="project" existingImages={existing} />);

    const images = screen.getAllByRole("presentation");
    expect(images.length).toBe(2);
  });

  it("validates accepted file types", () => {
    render(
      <ImageUploader
        entityType="project"
        acceptedTypes={["image/jpeg", "image/png"]}
      />,
    );

    expect(screen.getByText(/JPEG, PNG/)).toBeInTheDocument();
  });
});
