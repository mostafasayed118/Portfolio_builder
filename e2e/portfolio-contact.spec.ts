import { test, expect } from "@playwright/test";

/**
 * Portfolio contact section coverage.
 *
 * NOTE: the ContactForm was refactored to SmartInput fields addressed via
 * `data-testid` (`input-name`, `input-email`, `input-message`) and the
 * section heading is "Get In Touch". Selectors here target the current DOM.
 * Full form *submission* is covered separately in
 * `portfolio-contact-submit.spec.ts` (it performs real API writes and is
 * rate-limited, so it lives in its own spec).
 */

test.describe("Portfolio contact form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Scroll to the contact section
    await page.evaluate(() => {
      document.querySelector("#contact")?.scrollIntoView({ behavior: "instant" });
    });
  });

  test("contact section is visible when scrolled to", async ({ page }) => {
    const contactHeading = page.getByRole("heading", { name: /get in touch/i });
    await expect(contactHeading).toBeVisible();
  });

  test("contact form has name, email, and message fields", async ({ page }) => {
    const nameInput = page.getByTestId("input-name");
    const emailInput = page.getByTestId("input-email");
    const messageInput = page.getByTestId("input-message");

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(messageInput).toBeVisible();
  });

  test("shows validation errors for empty submission", async ({ page }) => {
    const submitBtn = page.getByTestId("btn-send-message");
    await submitBtn.click();

    // Client-side validation marks the empty fields with error styling and
    // alerts; the form must not navigate away or submit.
    await expect(page.getByRole("alert").first()).toBeVisible();
    const nameInput = page.getByTestId("input-name");
    await expect(nameInput).toBeVisible();
  });

  test("can fill in the contact form fields", async ({ page }) => {
    const nameInput = page.getByTestId("input-name");
    const emailInput = page.getByTestId("input-email");
    const messageInput = page.getByTestId("input-message");

    await nameInput.fill("Test User");
    await emailInput.fill("test@example.com");
    await messageInput.fill("This is a test message for the portfolio contact form.");

    await expect(nameInput).toHaveValue("Test User");
    await expect(emailInput).toHaveValue("test@example.com");
    await expect(messageInput).toHaveValue("This is a test message for the portfolio contact form.");
  });
});
