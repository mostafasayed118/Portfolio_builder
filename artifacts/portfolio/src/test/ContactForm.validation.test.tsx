import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import ContactForm from "@/components/ContactForm";

const { mockGetCsrfToken, mockClearCsrfCache, mockTrackEvent } = vi.hoisted(
  () => ({
    mockGetCsrfToken: vi.fn(),
    mockClearCsrfCache: vi.fn(),
    mockTrackEvent: vi.fn(),
  }),
);

vi.mock("@/lib/csrf", () => ({
  getCsrfToken: mockGetCsrfToken,
  clearCsrfCache: mockClearCsrfCache,
}));

vi.mock("@/lib/env", () => ({
  getApiUrl: () => "http://test-api",
}));

vi.mock("@/hooks/use-reveal", () => ({
  useReveal: vi.fn(() => ({ ref: vi.fn(), revealed: true })),
}));

vi.mock("@workspace/db/contact-info", () => ({
  getContactInfo: vi.fn(),
}));

vi.mock("@workspace/db/analytics", () => ({
  trackEvent: mockTrackEvent,
}));

const labels = {
  name: "Your Name",
  email: "Your Email",
  message: "Message",
  sending: "Sending…",
  send: "Send Message",
  successTitle: "Message sent",
  successMessage: "Thanks for reaching out.",
  errorMessage: "Something went wrong.",
};

function renderContactForm() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>
        <ContactForm labels={labels} />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByTestId("input-name"), "Ada Lovelace");
  await user.type(screen.getByTestId("input-email"), "ada@example.com");
  await user.type(
    screen.getByTestId("input-message"),
    "Hello, I'd like to discuss a data engineering project with you.",
  );
}

describe("ContactForm — 4-layer validation (vanilla rules via useFormValidation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCsrfToken.mockResolvedValue("csrf-token-123");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the three required fields and the submit button", () => {
    renderContactForm();
    expect(screen.getByTestId("input-name")).toBeInTheDocument();
    expect(screen.getByTestId("input-email")).toBeInTheDocument();
    expect(screen.getByTestId("input-message")).toBeInTheDocument();
    expect(screen.getByTestId("btn-send-message")).toHaveTextContent(
      labels.send,
    );
  });

  it("does not show any validation errors before the user touches a field", () => {
    renderContactForm();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows 'required' errors for all three fields after a blank submit (validateAll path)", async () => {
    const user = userEvent.setup();
    renderContactForm();

    await user.click(screen.getByTestId("btn-send-message"));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(screen.getByText("Email is required")).toBeInTheDocument();
      expect(screen.getByText("Message is required")).toBeInTheDocument();
    });
    expect(mockGetCsrfToken).not.toHaveBeenCalled();
  });

  it("shows a per-field error after blur on an empty field (real-time path)", async () => {
    const user = userEvent.setup();
    renderContactForm();

    await user.click(screen.getByTestId("input-name"));
    await user.tab();

    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.queryByText("Email is required")).not.toBeInTheDocument();
  });

  it("clears the name error as soon as the user types a valid value", async () => {
    const user = userEvent.setup();
    renderContactForm();

    const nameInput = screen.getByTestId("input-name");
    await user.click(nameInput);
    await user.tab();
    expect(screen.getByText("Name is required")).toBeInTheDocument();

    await user.type(nameInput, "Ada");
    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
  });

  it("rejects an invalid email after blur", async () => {
    const user = userEvent.setup();
    renderContactForm();

    const emailInput = screen.getByTestId("input-email");
    await user.type(emailInput, "not-an-email");
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it("rejects a message shorter than 10 characters after blur", async () => {
    const user = userEvent.setup();
    renderContactForm();

    const messageInput = screen.getByTestId("input-message");
    await user.type(messageInput, "short");
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/at least 10/i)).toBeInTheDocument();
    });
  });

  it("on a valid submit, fetches CSRF, POSTs to /api/v1/contact with the honeypot timestamp, and shows the success state", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/csrf-token")) {
        return new Response(JSON.stringify({ csrfToken: "csrf-token-123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/api/v1/contact")) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error("Unexpected fetch: " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderContactForm();
    await fillValidForm(user);
    await user.click(screen.getByTestId("btn-send-message"));

    await waitFor(() => {
      expect(screen.getByText(labels.successTitle)).toBeInTheDocument();
    });
    expect(mockGetCsrfToken).toHaveBeenCalledTimes(1);

    const contactCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/api/v1/contact"),
    );
    expect(contactCall).toBeDefined();
    const init = contactCall![1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.name).toBe("Ada Lovelace");
    expect(body.email).toBe("ada@example.com");
    expect(body.message).toMatch(/data engineering/);
    expect(typeof body._formLoadedAt).toBe("number");
    expect((init.headers as Record<string, string>)["x-csrf-token"]).toBe(
      "csrf-token-123",
    );
    expect(screen.getByTestId("btn-send-another")).toBeInTheDocument();
  });

  it("disables the submit button and shows the sending label while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolveContact: (v: Response) => void = () => {};
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/csrf-token")) {
        return new Response(JSON.stringify({ csrfToken: "csrf-token-123" }), {
          status: 200,
        });
      }
      if (url.includes("/api/v1/contact")) {
        return new Promise<Response>((resolve) => {
          resolveContact = resolve;
        });
      }
      throw new Error("Unexpected fetch: " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderContactForm();
    await fillValidForm(user);
    await user.click(screen.getByTestId("btn-send-message"));

    await waitFor(() => {
      expect(screen.getByTestId("btn-send-message")).toBeDisabled();
    });
    expect(screen.getByTestId("btn-send-message")).toHaveTextContent(
      labels.sending,
    );

    resolveContact(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    await waitFor(() => {
      expect(screen.getByText(labels.successTitle)).toBeInTheDocument();
    });
  });

  it("on a 500 response with JSON message, shows that server message and a 'Try again' link", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/csrf-token")) {
        return new Response(JSON.stringify({ csrfToken: "csrf-token-123" }), { status: 200 });
      }
      if (url.includes("/api/v1/contact")) {
        return new Response(
          JSON.stringify({ success: false, message: "Rate limit exceeded" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error("Unexpected fetch: " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderContactForm();
    await fillValidForm(user);
    await user.click(screen.getByTestId("btn-send-message"));

    await waitFor(() => {
      expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
    });
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
    expect(screen.queryByTestId("btn-send-another")).not.toBeInTheDocument();
  });

  it("'Send Another' button resets the form back to its initial empty state", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/csrf-token")) {
        return new Response(JSON.stringify({ csrfToken: "csrf-token-123" }), { status: 200 });
      }
      if (url.includes("/api/v1/contact")) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      throw new Error("Unexpected fetch: " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderContactForm();
    await fillValidForm(user);
    await user.click(screen.getByTestId("btn-send-message"));

    const sendAnother = await screen.findByTestId("btn-send-another");
    await user.click(sendAnother);

    await waitFor(() => {
      expect(screen.getByTestId("input-name")).toHaveValue("");
    });
    expect(screen.getByTestId("input-email")).toHaveValue("");
    expect(screen.getByTestId("input-message")).toHaveValue("");
    expect(screen.getByTestId("btn-send-message")).toBeEnabled();
  });

  it("on a CSRF error during submit, clears the CSRF cache and shows the generic error", async () => {
    const user = userEvent.setup();
    mockGetCsrfToken.mockRejectedValue(new Error("CSRF fetch failed (500)"));

    renderContactForm();
    await fillValidForm(user);
    await user.click(screen.getByTestId("btn-send-message"));

    await waitFor(() => {
      expect(screen.getByText(labels.errorMessage)).toBeInTheDocument();
    });
    expect(mockClearCsrfCache).toHaveBeenCalled();
  });

  it("fires no validation errors when the user blurs a field that is already valid", async () => {
    const user = userEvent.setup();
    renderContactForm();

    const nameInput = screen.getByTestId("input-name");
    await user.type(nameInput, "Grace Hopper");
    await user.tab();

    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    expect(screen.queryByText(/too short/i)).not.toBeInTheDocument();
  });

  it("does not POST to /api/v1/contact when validation fails on submit", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderContactForm();
    await user.type(screen.getByTestId("input-name"), "Ada");
    await user.type(screen.getByTestId("input-email"), "ada@example.com");
    await user.click(screen.getByTestId("btn-send-message"));

    await waitFor(() => {
      expect(screen.getByText("Message is required")).toBeInTheDocument();
    });
    const contactCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/api/v1/contact"),
    );
    expect(contactCalls).toHaveLength(0);
  });

  it("the contact-name input is wired with aria-describedby pointing at the error element when invalid + touched", async () => {
    const user = userEvent.setup();
    renderContactForm();

    const nameInput = screen.getByTestId("input-name");
    expect(nameInput).not.toHaveAttribute("aria-describedby");

    await user.click(nameInput);
    await user.tab();

    await waitFor(() => {
      expect(nameInput.getAttribute("aria-describedby")).toBe("error-name");
    });
    expect(document.getElementById("error-name")).toHaveTextContent(
      "Name is required",
    );
  });

  it("uses fireEvent.change to update the value mid-test without breaking the controlled component", () => {
    renderContactForm();
    const nameInput = screen.getByTestId("input-name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Bulk assign" } });
    expect(nameInput.value).toBe("Bulk assign");
  });
});
