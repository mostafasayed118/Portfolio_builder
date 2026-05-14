import { render, screen } from "@testing-library/react";
import HeroSection from "@/components/HeroSection";

vi.mock("@/hooks/use-typewriter", () => ({
  useTypewriter: vi.fn(() => "Data Engineer"),
}));

describe("HeroSection", () => {
  it("renders the heading and name", () => {
    render(<HeroSection />);
    expect(screen.getByText("Hi, I'm")).toBeInTheDocument();
    expect(screen.getByText("Mustafa Sayed")).toBeInTheDocument();
  });

  it("renders GitHub link", () => {
    render(<HeroSection />);
    const link = screen.getByLabelText("GitHub");
    expect(link).toBeInTheDocument();
  });

  it("renders LinkedIn link", () => {
    render(<HeroSection />);
    const link = screen.getByLabelText("LinkedIn");
    expect(link).toBeInTheDocument();
  });

  it("renders Email link", () => {
    render(<HeroSection />);
    const link = screen.getByLabelText("Email");
    expect(link).toBeInTheDocument();
  });

  it("renders download CV button", () => {
    render(<HeroSection />);
    const btn = screen.getByText("Download CV");
    expect(btn).toBeInTheDocument();
  });
});
