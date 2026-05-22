import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ContactManager from "@/pages/ContactManager";

const { mockContactGet, mockContactUpdate, mockToastSuccess } = vi.hoisted(
  () => ({
    mockContactGet: vi.fn(),
    mockContactUpdate: vi.fn(),
    mockToastSuccess: vi.fn(),
  }),
);

vi.mock("@/lib/api-client", () => ({
  api: {
    contactInfo: {
      get: mockContactGet,
      update: mockContactUpdate,
    },
  },
}));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return {
    ...actual,
    useToast: () => ({ toast: mockToastSuccess }),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const mockContactData = {
  email: "test@example.com",
  phone: "+201234567890",
  location: "Cairo, Egypt",
  github: "https://github.com/test",
  linkedin: "https://linkedin.com/in/test",
  whatsapp: "+201234567890",
  map_embed_url: "https://maps.google.com/embed",
  availability_status: "Open to work",
};

describe("ContactManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContactGet.mockResolvedValue({ success: true, data: mockContactData });
    mockContactUpdate.mockResolvedValue({ success: true });
  });

  it("renders form fields correctly", async () => {
    renderWithProviders(<ContactManager />);

    expect(await screen.findByText("Contact Info")).toBeInTheDocument();
    expect(screen.getByText("Contact Details")).toBeInTheDocument();
    expect(screen.getByText("Email Address")).toBeInTheDocument();
    expect(screen.getByText("Phone Number")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
  });

  it("pre-fills form from fetched contact data", async () => {
    renderWithProviders(<ContactManager />);

    await expect(screen.findByDisplayValue("test@example.com")).resolves.toBeInTheDocument();
    expect(screen.getAllByDisplayValue("+201234567890").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByDisplayValue("Cairo, Egypt")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://github.com/test")).toBeInTheDocument();
  });

  it("calls update on save", async () => {
    renderWithProviders(<ContactManager />);

    await screen.findByDisplayValue("test@example.com");

    const emailInput = screen.getByDisplayValue("test@example.com");
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "new@example.com");

    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockContactUpdate).toHaveBeenCalled();
    });
  });

  it("shows success toast after save", async () => {
    renderWithProviders(<ContactManager />);

    await screen.findByDisplayValue("test@example.com");

    const emailInput = screen.getByDisplayValue("test@example.com");
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "new@example.com");

    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Contact info saved" }),
      );
    });
  });

  it("validates URL fields on save", async () => {
    mockContactUpdate.mockRejectedValue(new Error("Invalid URL"));

    renderWithProviders(<ContactManager />);

    await screen.findByDisplayValue("test@example.com");

    const githubInput = screen.getByDisplayValue("https://github.com/test");
    await userEvent.clear(githubInput);
    await userEvent.type(githubInput, "invalid-url");

    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining("Save failed"), variant: "destructive" }),
      );
    });
  });
});
