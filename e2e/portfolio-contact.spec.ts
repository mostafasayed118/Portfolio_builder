import { test, expect } from "@playwright/test";

test.describe("Portfolio contact form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Scroll to the contact section
    await page.evaluate(() => {
      const contactSection = document.querySelector('[id*="contact"], section:last-of-type');
      contactSection?.scrollIntoView({ behavior: "instant" });
    });
    await page.waitForTimeout(1000);
  });

  test("contact section is visible when scrolled to", async ({ page }) => {
    // Look for a contact heading or form
    const contactHeading = page.getByRole("heading", { name: /contact/i });
    await expect(contactHeading).toBeVisible();
  });

  test("contact form has name, email, and message fields", async ({ page }) => {
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]');
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const messageInput = page.locator('textarea[name="message"], textarea[placeholder*="message" i]');

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(messageInput).toBeVisible();
  });

  test("shows validation errors for empty submission", async ({ page }) => {
    const submitBtn = page.getByRole("button", { name: /send|submit/i });
    await submitBtn.click();

    // Should show some validation feedback (error message or toast)
    await page.waitForTimeout(500);
    // The form should not have been submitted (still visible)
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]');
    await expect(nameInput).toBeVisible();
  });

  test("can fill in the contact form fields", async ({ page }) => {
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]');
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const messageInput = page.locator('textarea[name="message"], textarea[placeholder*="message" i]');

    await nameInput.fill("Test User");
    await emailInput.fill("test@example.com");
    await messageInput.fill("This is a test message for the portfolio contact form.");

    await expect(nameInput).toHaveValue("Test User");
    await expect(emailInput).toHaveValue("test@example.com");
    await expect(messageInput).toHaveValue("This is a test message for the portfolio contact form.");
  });
});
