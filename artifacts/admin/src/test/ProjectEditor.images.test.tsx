import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, stubUseToast } from "./helpers";
import { ProjectEditor } from "@/features/projects/components/ProjectEditor";

const { mockImagesList, mockImagesDelete, mockImagesReorder } = vi.hoisted(() => ({
  mockImagesList: vi.fn(),
  mockImagesDelete: vi.fn(),
  mockImagesReorder: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    images: {
      list: mockImagesList,
      delete: mockImagesDelete,
      reorder: mockImagesReorder,
    },
  },
}));

vi.mock("@workspace/ui", (importOriginal) => stubUseToast(importOriginal));

vi.mock("@/features/ai", () => ({
  AiTextButton: () => null,
}));

/** Surface the ImageUploader props the editor wires up so tests can drive them. */
vi.mock("@/components/ImageUploader", () => ({
  default: ({
    existingImages,
    onDeleteExisting,
    onReorderExisting,
  }: {
    existingImages?: { id: string; url: string }[];
    onDeleteExisting?: (id: string) => void;
    onReorderExisting?: (orderedIds: string[]) => void;
  }) => (
    <div>
      <div data-testid="existing-images">{JSON.stringify(existingImages ?? [])}</div>
      {existingImages?.map((img) => (
        <div key={img.id} data-testid={`image-${img.id}`}>
          {img.url}
          <button data-testid={`delete-${img.id}`} onClick={() => onDeleteExisting?.(img.id)}>
            delete
          </button>
          <button
            data-testid={`reorder-${img.id}`}
            onClick={() => onReorderExisting?.(existingImages.map((i) => i.id).reverse())}
          >
            reorder
          </button>
        </div>
      ))}
    </div>
  ),
}));

const EDITING = {
  id: "proj-1",
  title: "Data Pipeline",
  description: "An ETL pipeline project",
  category: "data-engineering",
  sort_order: 1,
  github_url: "https://github.com/test",
  featured: true,
  is_published: true,
};

const IMAGES = [
  { id: "img-1", url: "https://cdn.example.com/project_images/a/original.jpg" },
  { id: "img-2", url: "https://cdn.example.com/project_images/a/second.png" },
];

function renderEditor(editing: Partial<typeof EDITING> | null = EDITING) {
  return renderWithProviders(
    <ProjectEditor editing={editing} isNew={false} saving={false} onEdit={() => {}} onSaved={() => {}} />,
  );
}

describe("ProjectEditor gallery images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImagesList.mockResolvedValue({ success: true, data: IMAGES });
    mockImagesDelete.mockResolvedValue({ success: true });
    mockImagesReorder.mockResolvedValue({ success: true });
  });

  it("loads the project's gallery images from the admin API", async () => {
    renderEditor();

    expect(mockImagesList).toHaveBeenCalledWith("projects", "proj-1");
    expect(await screen.findByTestId("image-img-1")).toBeInTheDocument();
    expect(screen.getByTestId("existing-images")).toHaveTextContent("original.jpg");
    expect(screen.getByTestId("existing-images")).toHaveTextContent("second.png");
  });

  it("shows no images when the API reports failure", async () => {
    mockImagesList.mockResolvedValue({ success: false, message: "boom" });

    renderEditor();

    await screen.findByTestId("existing-images");
    expect(screen.getByTestId("existing-images")).toHaveTextContent("[]");
  });

  it("does not fetch when editing is null (add-project dialog)", () => {
    renderEditor(null);

    expect(mockImagesList).not.toHaveBeenCalled();
  });

  it("re-fetches when a different project is edited", async () => {
    const { rerender } = renderEditor();
    await screen.findByTestId("image-img-1");

    rerender(
      <ProjectEditor
        editing={{ ...EDITING, id: "proj-2" }}
        isNew={false}
        saving={false}
        onEdit={() => {}}
        onSaved={() => {}}
      />,
    );

    await vi.waitFor(() => {
      expect(mockImagesList).toHaveBeenLastCalledWith("projects", "proj-2");
    });
  });

  it("deletes an existing image through the admin API and drops it from the grid", async () => {
    renderEditor();
    await screen.findByTestId("image-img-1");

    await userEvent.click(screen.getByTestId("delete-img-1"));

    await vi.waitFor(() => {
      expect(mockImagesDelete).toHaveBeenCalledWith("img-1");
    });
    expect(screen.queryByTestId("image-img-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("image-img-2")).toBeInTheDocument();
  });

  it("reorders existing images through the admin API", async () => {
    renderEditor();
    await screen.findByTestId("image-img-1");

    await userEvent.click(screen.getByTestId("reorder-img-1"));

    await vi.waitFor(() => {
      expect(mockImagesReorder).toHaveBeenCalledWith(["img-2", "img-1"]);
    });
  });
});
