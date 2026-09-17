import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContactInfoPanel from "@/features/contact/components/ContactInfoPanel";

const { trackEvent, resolveDefaultPortfolioId } = vi.hoisted(() => ({
  trackEvent: vi.fn().mockResolvedValue(undefined), resolveDefaultPortfolioId: vi.fn(),
}));
vi.mock("@workspace/db/analytics", () => ({ trackEvent }));
vi.mock("@/lib/analytics-portfolio", () => ({ resolveDefaultPortfolioId }));
vi.mock("@/lib/supabase-provider", () => ({ getSupabase: () => ({}), isSupabaseConfigured: true }));
vi.mock("@/lib/language", () => ({ useLanguage: () => ({ t: { contact: { labels: {}, whatsappPrefill: "Hello" } } }) }));
const contact = {
  email: "visitor@example.org", phone: "12345", location: "Cairo", github: "https://github.com/test",
  linkedin: "https://linkedin.com/test", youtube: "https://youtube.com/test", facebook: "https://facebook.com/test", whatsapp: "12345",
};

beforeEach(() => {
  vi.clearAllMocks();
  resolveDefaultPortfolioId.mockResolvedValue("published-portfolio");
});

describe("contact panel analytics", () => {
  it.each(["email", "github", "linkedin", "youtube", "facebook", "whatsapp"])("stamps %s clicks", async (type) => {
    render(<ContactInfoPanel contact={contact} />);
    const link = screen.getByTestId(`link-contact-${type}`);
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith(expect.anything(), "contact_click", "/", { type }, "published-portfolio"));
  });

  it.each(["email", "whatsapp"])("skips %s clicks when no portfolio resolves", async (type) => {
    resolveDefaultPortfolioId.mockResolvedValue(null);
    render(<ContactInfoPanel contact={contact} />);
    const link = screen.getByTestId(`link-contact-${type}`);
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    await waitFor(() => expect(resolveDefaultPortfolioId).toHaveBeenCalled());
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
