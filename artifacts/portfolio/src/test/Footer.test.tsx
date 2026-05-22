import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";

vi.mock("@/lib/branding", () => ({
  useBranding: vi.fn(() => ({ siteName: "Mustafa Sayed" })),
}));

import Footer from "@/components/Footer";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>{ui}</LanguageProvider>
    </QueryClientProvider>
  );
}

describe("Footer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders site name", () => {
    renderWithProviders(<Footer />);
    expect(screen.getByText("Mustafa Sayed")).toBeInTheDocument();
  });

  it("renders copyright text", () => {
    renderWithProviders(<Footer />);
    expect(screen.getByText(/Data Engineer/)).toBeInTheDocument();
  });

  it("renders social links", () => {
    renderWithProviders(<Footer />);
    expect(screen.getByTestId("footer-link-github")).toBeInTheDocument();
    expect(screen.getByTestId("footer-link-linkedin")).toBeInTheDocument();
    expect(screen.getByTestId("footer-link-email")).toBeInTheDocument();
  });
});
