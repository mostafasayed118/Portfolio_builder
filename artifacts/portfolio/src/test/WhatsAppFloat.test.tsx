import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WhatsAppFloat from "@/features/contact/components/WhatsAppFloat";

const mockTrackEvent = vi.fn();
const mockUseContact = vi.fn();

vi.mock("@/features/contact/hooks/useContact", () => ({
  useContact: () => mockUseContact(),
}));

vi.mock("@/lib/language", () => ({
  useLanguage: () => ({
    t: {
      contact: {
        chatOnWhatsApp: "Chat on WhatsApp",
        whatsappPrefill: "Hi Mustafa!",
      },
    },
  }),
}));

const resolvePortfolio = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics-portfolio", () => ({ resolveDefaultPortfolioId: resolvePortfolio }));

vi.mock("@/lib/supabase-provider", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({}),
}));

vi.mock("@workspace/db/analytics", () => ({
  trackEvent: (...args: unknown[]) => {
    mockTrackEvent(...args);
    return Promise.resolve();
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  resolvePortfolio.mockResolvedValue("published-portfolio");
  mockUseContact.mockReturnValue({ contact: { whatsapp: "+20 115 458 0512" } });
});

describe("WhatsAppFloat", () => {
  it("skips analytics when portfolio resolution fails", async () => {
    resolvePortfolio.mockResolvedValue(null);
    render(<WhatsAppFloat />);
    fireEvent.click(screen.getByTestId("btn-whatsapp-float"));
    await waitFor(() => expect(resolvePortfolio).toHaveBeenCalled());
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
  it("renders a fixed wa.me bubble with digits stripped when a number exists", () => {
    render(<WhatsAppFloat />);
    const link = screen.getByTestId("btn-whatsapp-float");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toContain("wa.me/201154580512");
    expect(link.getAttribute("href")).toContain("text=Hi%20Mustafa!");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("aria-label")).toBe("Chat on WhatsApp");
  });

  it("renders nothing when the number has no digits", () => {
    mockUseContact.mockReturnValue({ contact: { whatsapp: "" } });
    render(<WhatsAppFloat />);
    expect(screen.queryByTestId("btn-whatsapp-float")).not.toBeInTheDocument();
  });

  it("fires the contact_click analytics event with placement 'floating' on click", async () => {
    render(<WhatsAppFloat />);
    fireEvent.click(screen.getByTestId("btn-whatsapp-float"));
    await waitFor(() => expect(mockTrackEvent).toHaveBeenCalledWith(expect.anything(), "contact_click", "/", {
      type: "whatsapp",
      placement: "floating",
    }, "published-portfolio"));
  });
});
