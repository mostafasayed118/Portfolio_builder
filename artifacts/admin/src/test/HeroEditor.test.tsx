import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HeroEditor from "@/pages/HeroEditor";

const { mockFetchHeroContent, mockUpsertHeroContent, mockToast } = vi.hoisted(
  () => ({
    mockFetchHeroContent: vi.fn(),
    mockUpsertHeroContent: vi.fn(),
    mockToast: vi.fn(),
  }),
);

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(() => ({})),
  isSupabaseConfigured: true,
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    hero: {
      get: mockFetchHeroContent,
      update: mockUpsertHeroContent,
    },
  },
}));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const mockHeroData = {
  id: "1",
  name: "John Doe",
  roles: ["Developer", "Designer"],
  heading: "Hello World",
  description: "A short bio about John",
  avatar_url: "https://example.com/avatar.jpg",
  cv_url: "https://example.com/cv.pdf",
  github_url: "https://github.com/johndoe",
  linkedin_url: "https://linkedin.com/in/johndoe",
  twitter_url: "https://twitter.com/johndoe",
  email: "john@example.com",
  stats: [{ label: "Projects", value: "10" }],
};

describe("HeroEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHeroContent.mockResolvedValue({ success: true, data: mockHeroData });
    mockUpsertHeroContent.mockResolvedValue({ success: true });
  });

  it("renders form fields correctly", async () => {
    renderWithProviders(<HeroEditor />);

    expect(await screen.findByPlaceholderText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Subtitle / Tagline")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Short bio...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://github.com/...")).toBeInTheDocument();
    expect(screen.getByText("Avatar & CV")).toBeInTheDocument();
  });

  it("pre-fills form from fetched hero data", async () => {
    renderWithProviders(<HeroEditor />);

    await expect(screen.findByDisplayValue("John Doe")).resolves.toBeInTheDocument();
    expect(screen.getByDisplayValue("A short bio about John")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://github.com/johndoe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com/avatar.jpg")).toBeInTheDocument();
  });

  it("save button disabled until form is dirty", async () => {
    renderWithProviders(<HeroEditor />);

    await screen.findByDisplayValue("John Doe");

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    expect(saveBtn).toBeDisabled();

    const nameInput = screen.getByDisplayValue("John Doe");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Jane Doe");

    expect(saveBtn).toBeEnabled();
  });

  it("calls upsertHeroContent on submit", async () => {
    renderWithProviders(<HeroEditor />);

    await screen.findByDisplayValue("John Doe");

    const nameInput = screen.getByDisplayValue("John Doe");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Jane Doe");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpsertHeroContent).toHaveBeenCalled();
    });
  });

  it("shows success toast after save", async () => {
    renderWithProviders(<HeroEditor />);

    await screen.findByDisplayValue("John Doe");

    const nameInput = screen.getByDisplayValue("John Doe");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Jane Doe");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Hero section updated successfully" }),
      );
    });
  });

  it("shows error toast on save failure", async () => {
    mockUpsertHeroContent.mockRejectedValue(new Error("Network error"));

    renderWithProviders(<HeroEditor />);

    await screen.findByDisplayValue("John Doe");

    const nameInput = screen.getByDisplayValue("John Doe");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Jane Doe");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Save failed: Network error", variant: "destructive" }),
      );
    });
  });
});
