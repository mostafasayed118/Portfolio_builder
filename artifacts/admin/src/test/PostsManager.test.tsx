import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PostsManager from "@/features/posts/components/PostsManager";

const {
  mockListPosts,
  mockCreatePost,
  mockUpdatePost,
  mockDeletePost,
} = vi.hoisted(() => ({
  mockListPosts: vi.fn(),
  mockCreatePost: vi.fn(),
  mockUpdatePost: vi.fn(),
  mockDeletePost: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(() => ({})),
  isSupabaseConfigured: true,
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    posts: {
      list: mockListPosts,
      create: mockCreatePost,
      update: mockUpdatePost,
      delete: mockDeletePost,
    },
  },
}));

vi.mock("@/components/ImageUploader", () => ({
  default: () => null,
}));

vi.mock("@/features/posts/components/MarkdownEditor", () => ({
  default: () => null,
}));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return {
    ...actual,
    useToast: () => ({ toast: vi.fn() }),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("PostsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPosts.mockResolvedValue({ success: true, data: [] });
    mockCreatePost.mockResolvedValue({ success: true, data: { id: "new-id" } });
    mockUpdatePost.mockResolvedValue({ success: true, data: { id: "1" } });
    mockDeletePost.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    window.location.hash = "";
  });

  it("renders the posts list", async () => {
    renderWithProviders(<PostsManager />);
    expect(await screen.findByText("Blog Posts")).toBeInTheDocument();
  });

  it("auto-opens the New Post editor from the #new deep link", async () => {
    window.location.hash = "#new";
    renderWithProviders(<PostsManager />);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("New Post")).toBeInTheDocument();
  });

  it("auto-opens the editor for the post targeted by the #edit-<id> deep link", async () => {
    mockListPosts.mockResolvedValue({
      success: true,
      data: [
        { id: "d1", title: "Old Draft", slug: "old", excerpt: null, content: "x", cover_image_url: null, tags: [], is_published: false, updated_at: "2024-01-01T00:00:00Z" },
        { id: "d2", title: "Latest Draft", slug: "latest", excerpt: null, content: "y", cover_image_url: null, tags: [], is_published: false, updated_at: "2024-03-01T00:00:00Z" },
      ],
    });
    window.location.hash = "#edit-d2";
    renderWithProviders(<PostsManager />);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Edit Post")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("Latest Draft")).toBeInTheDocument();
  });
});
