import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockInvalidateQueries = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

const mockSeedRun = vi.fn();
vi.mock("@/lib/api-client", () => ({
  api: {
    seed: {
      run: (...args: unknown[]) => mockSeedRun(...args),
    },
  },
}));

import { SeedDialog } from "@/components/SeedDialog";

describe("SeedDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the trigger button", () => {
    render(<SeedDialog />);
    expect(
      screen.getByText("Import Static Data"),
    ).toBeInTheDocument();
  });

  it("opens dialog when trigger is clicked", async () => {
    render(<SeedDialog />);

    await userEvent.click(screen.getByText("Import Static Data"));

    expect(screen.getByText("Import Now")).toBeInTheDocument();
  });

  it("shows 'Importing…' while loading", async () => {
    // Make the API call never resolve during this test
    mockSeedRun.mockReturnValue(new Promise(() => {}));

    render(<SeedDialog />);
    await userEvent.click(screen.getByText("Import Static Data"));
    await userEvent.click(screen.getByText("Import Now"));

    expect(screen.getByText("Importing…")).toBeInTheDocument();
  });

  it("disables import button while loading", async () => {
    mockSeedRun.mockReturnValue(new Promise(() => {}));

    render(<SeedDialog />);
    await userEvent.click(screen.getByText("Import Static Data"));
    await userEvent.click(screen.getByText("Import Now"));

    expect(screen.getByText("Importing…")).toBeDisabled();
  });

  it("shows success summary on successful import", async () => {
    mockSeedRun.mockResolvedValue({
      success: true,
      data: {
        summary: { projects: 8, skills: 35, experience: 3 },
        errors: [],
      },
    });

    render(<SeedDialog />);
    await userEvent.click(screen.getByText("Import Static Data"));
    await userEvent.click(screen.getByText("Import Now"));

    expect(await screen.findByText("Import Complete")).toBeInTheDocument();
    expect(screen.getByText("projects")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("skills")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
  });

  it("shows errors on failed import", async () => {
    mockSeedRun.mockResolvedValue({
      success: false,
      message: "Database connection failed",
    });

    render(<SeedDialog />);
    await userEvent.click(screen.getByText("Import Static Data"));
    await userEvent.click(screen.getByText("Import Now"));

    expect(await screen.findByText("Import Failed")).toBeInTheDocument();
    expect(
      screen.getByText("• Database connection failed"),
    ).toBeInTheDocument();
  });

  it("invalidates queries after successful import", async () => {
    mockSeedRun.mockResolvedValue({
      success: true,
      data: { summary: { projects: 1 }, errors: [] },
    });

    render(<SeedDialog />);
    await userEvent.click(screen.getByText("Import Static Data"));
    await userEvent.click(screen.getByText("Import Now"));

    await screen.findByText("Import Complete");

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["projects"],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["skills"],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["experience"],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["certifications"],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["heroContent"],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["aboutContent"],
    });
  });
});
