import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";

vi.mock("@/hooks/use-reveal", () => ({
  useReveal: vi.fn(() => ({ ref: vi.fn(), revealed: true })),
}));

vi.mock("@workspace/db/contact-info", () => ({
  getContactInfo: vi.fn(),
}));

vi.mock("@workspace/db/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@workspace/ui", () => ({
  useFormValidation: vi.fn(() => ({
    values: { name: "", email: "", message: "" },
    errors: {},
    touched: {},
    isSubmitting: false,
    setField: vi.fn(),
    handleBlur: vi.fn(),
    validateAll: vi.fn(() => false),
    setIsSubmitting: vi.fn(),
    reset: vi.fn(),
  })),
  SmartInput: (props: any) => <input {...props} />,
  SmartTextarea: (props: any) => <textarea {...props} />,
  createValidationRules: vi.fn(() => ({
    required: vi.fn(),
    maxLength: vi.fn(),
    email: vi.fn(),
  })),
}));

vi.mock("@workspace/validation/schemas", () => ({
  contactFormSchema: {},
}));

vi.mock("@/lib/csrf", () => ({
  getCsrfToken: vi.fn(),
  clearCsrfCache: vi.fn(),
}));

vi.mock("@/components/SectionLabel", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import ContactSection from "@/components/ContactSection";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>{ui}</LanguageProvider>
    </QueryClientProvider>
  );
}

describe("ContactSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders form fields", () => {
    renderWithProviders(<ContactSection />);
    expect(screen.getByLabelText("Your Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Your Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });

  it("renders contact info", () => {
    renderWithProviders(<ContactSection />);
    // The contact info section renders labels
    const emailLabel = screen.getAllByText("Email");
    expect(emailLabel.length).toBeGreaterThan(0);
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
  });

  it("renders send button", () => {
    renderWithProviders(<ContactSection />);
    expect(screen.getByText("Send Message")).toBeInTheDocument();
  });

  it("renders the contact form", () => {
    renderWithProviders(<ContactSection />);
    const form = screen.getByTestId("form-contact");
    expect(form).toBeInTheDocument();
  });
});
