import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("hides delete/reorder controls when no handlers are provided", () => {
    const existing = [{ id: "img1", url: "https://example.com/a.jpg" }];
    render(<ImageUploader entityType="projects" existingImages={existing} />);
    expect(screen.queryByLabelText("Delete image")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Move image up")).not.toBeInTheDocument();
  });

  it("calls onDeleteExisting with the image id", async () => {
    const onDelete = vi.fn();
    const existing = [
      { id: "img1", url: "https://example.com/a.jpg" },
      { id: "img2", url: "https://example.com/b.jpg" },
    ];
    render(<ImageUploader entityType="projects" existingImages={existing} onDeleteExisting={onDelete} />);

    const deleteButtons = screen.getAllByLabelText("Delete image");
    expect(deleteButtons.length).toBe(2);
    await userEvent.click(deleteButtons[1]);
    expect(onDelete).toHaveBeenCalledWith("img2");
  });

  it("calls onReorderExisting with the swapped order when moving down", async () => {
    const onReorder = vi.fn();
    const existing = [
      { id: "img1", url: "https://example.com/a.jpg" },
      { id: "img2", url: "https://example.com/b.jpg" },
      { id: "img3", url: "https://example.com/c.jpg" },
    ];
    render(<ImageUploader entityType="projects" existingImages={existing} onReorderExisting={onReorder} />);

    await userEvent.click(screen.getAllByLabelText("Move image down")[0]);
    expect(onReorder).toHaveBeenCalledWith(["img2", "img1", "img3"]);
  });

  it("disables boundary moves (first tile has no up, last has no down)", () => {
    const existing = [
      { id: "img1", url: "https://example.com/a.jpg" },
      { id: "img2", url: "https://example.com/b.jpg" },
    ];
    render(<ImageUploader entityType="projects" existingImages={existing} onReorderExisting={vi.fn()} />);

    // Two tiles: tile 1 can only move down, tile 2 can only move up.
    expect(screen.getAllByLabelText("Move image down").length).toBe(1);
    expect(screen.getAllByLabelText("Move image up").length).toBe(1);
  });
});
