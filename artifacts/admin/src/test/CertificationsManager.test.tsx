import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CertificationsManager from "@/pages/CertificationsManager";

const {
  mockListCertificationRows,
  mockCreateCertificationRow,
  mockUpdateCertificationRow,
  mockDeleteCertification,
} = vi.hoisted(() => ({
  mockListCertificationRows: vi.fn(),
  mockCreateCertificationRow: vi.fn(),
  mockUpdateCertificationRow: vi.fn(),
  mockDeleteCertification: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(() => ({})),
  isSupabaseConfigured: true,
}));

vi.mock("@workspace/db/certifications", () => ({
  listCertificationRows: mockListCertificationRows,
  createCertificationRow: mockCreateCertificationRow,
  updateCertificationRow: mockUpdateCertificationRow,
  deleteCertification: mockDeleteCertification,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const mockCertifications = [
  {
    id: "1",
    title: "AWS Certified Data Engineer",
    issuer: "Amazon",
    issuer_logo: "☁️",
    date: "Mar 2024",
    date_sort: "2024-03",
    category: "Cloud",
    credential_url: "https://aws.amazon.com/certification/",
    credential_id: "ABC123",
    sort_order: 1,
    is_published: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    skills: [],
  },
  {
    id: "2",
    title: "Google Data Analytics",
    issuer: "Google",
    issuer_logo: "📊",
    date: "Jan 2024",
    date_sort: "2024-01",
    category: "Data",
    credential_url: null,
    credential_id: null,
    sort_order: 2,
    is_published: false,
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    skills: [],
  },
];

describe("CertificationsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListCertificationRows.mockResolvedValue(mockCertifications);
    mockCreateCertificationRow.mockResolvedValue({
      ...mockCertifications[0],
      id: "new-id",
    });
    mockUpdateCertificationRow.mockResolvedValue(mockCertifications[0]);
    mockDeleteCertification.mockResolvedValue(undefined);
  });

  it("renders certifications grid", async () => {
    renderWithProviders(<CertificationsManager />);

    expect(await screen.findByText("Certifications")).toBeInTheDocument();
    expect(screen.getByText("AWS Certified Data Engineer")).toBeInTheDocument();
    expect(screen.getByText("Google Data Analytics")).toBeInTheDocument();
    expect(screen.getByText("2 certifications")).toBeInTheDocument();
    expect(screen.getByText("Cloud")).toBeInTheDocument();
    expect(screen.getByText("Data")).toBeInTheDocument();
  });

  it("calls createCertificationRow on submit", async () => {
    renderWithProviders(<CertificationsManager />);

    await screen.findByText("Certifications");
    await userEvent.click(screen.getByText("Add Cert"));
    await screen.findByText("Add Certification");

    const dialog = screen.getByRole("dialog");
    const titleInput = within(dialog).getAllByRole("textbox")[0];
    const issuerInput = within(dialog).getAllByRole("textbox")[1];

    await userEvent.type(titleInput, "New Cert");
    await userEvent.type(issuerInput, "Test Org");

    await userEvent.click(within(dialog).getByText("Save"));

    await waitFor(() => {
      expect(mockCreateCertificationRow).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: "New Cert",
          issuer: "Test Org",
        }),
      );
    });
  });

  it("confirms before deleting certification", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = renderWithProviders(<CertificationsManager />);

    await screen.findByText("Certifications");

    const deleteBtn = container.querySelector(
      "button.text-destructive",
    ) as HTMLElement;
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith("Delete?");
      expect(mockDeleteCertification).toHaveBeenCalledWith({}, "1");
    });

    confirmSpy.mockRestore();
  });
});
