import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import HeroSection from "@/components/HeroSection";

vi.mock("@/hooks/use-typewriter", () => ({
  useTypewriter: vi.fn(() => "Data Engineer"),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>{ui}</LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("HeroSection", () => {
  it("renders the heading and name", () => {
    renderWithProviders(<HeroSection />);
    expect(screen.getByText("Hi, I'm")).toBeInTheDocument();
    expect(screen.getByText("Mustafa Sayed")).toBeInTheDocument();
  });

  it("renders GitHub link", () => {
    renderWithProviders(<HeroSection />);
    const link = screen.getByLabelText("GitHub");
    expect(link).toBeInTheDocument();
  });

  it("renders LinkedIn link", () => {
    renderWithProviders(<HeroSection />);
    const link = screen.getByLabelText("LinkedIn");
    expect(link).toBeInTheDocument();
  });

  it("renders Email link", () => {
    renderWithProviders(<HeroSection />);
    const link = screen.getByLabelText("Email");
    expect(link).toBeInTheDocument();
  });

  it("renders download CV button", () => {
    renderWithProviders(<HeroSection />);
    const btn = screen.getByText("Download CV");
    expect(btn).toBeInTheDocument();
  });
});
