import { test, expect } from "@playwright/test";

/**
 * Full end-to-end submission of the public contact form (portfolio app).
 *
 * This exercises the complete chain: browser form → CSRF token fetch →
 * POST /api/v1/contact → origin check → time-trap → validation → Supabase
 * `messages` insert → success UI. It is intentionally the ONLY spec that
 * performs real contact submissions because the API rate-limits contact
 * POSTs to 5/hour/IP.
 */

test.describe("Portfolio contact form — full submission", () => {
  test("filling the form and submitting shows the success state", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await page.goto("/");
    await page.evaluate(() => {
      document.querySelector("#contact")?.scrollIntoView({ behavior: "instant" });
    });

    const name = page.getByTestId("input-name");
    const email = page.getByTestId("input-email");
    const message = page.getByTestId("input-message");
    await expect(name).toBeVisible();

    // Unique email per run: the DB-level spam guard (044_contact_spam_guard.sql)
    // rejects more than 5 messages from the same email within an hour.
    const unique = Date.now();
    await name.fill(`E2E Tester ${unique}`);
    await email.fill(`e2e-contact-test-${unique}@example.com`);
    await message.fill(
      "Automated E2E contact submission — verifying the full browser→API→Supabase chain.",
    );

    // The server silently drops submissions that complete in under 2 seconds
    // (time-trap). Wait past the threshold before submitting.
    await page.waitForTimeout(2500);

    await page.getByTestId("btn-send-message").click();

    await expect(page.getByText("Message sent!")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Thank you for reaching out/i)).toBeVisible();
    await expect(page.getByTestId("btn-send-another")).toBeVisible();

    const fatalErrors = consoleErrors.filter(
      (e) => !/favicon|net::|ERR_|failed to load resource/i.test(e),
    );
    expect(fatalErrors, `Unexpected console errors:\n${fatalErrors.join("\n")}`).toEqual([]);
  });

  test("send another resets the form for a second submission", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      document.querySelector("#contact")?.scrollIntoView({ behavior: "instant" });
    });

    const name = page.getByTestId("input-name");
    await expect(name).toBeVisible();
    const unique = Date.now();
    await name.fill(`E2E Repeat Tester ${unique}`);
    await page.getByTestId("input-email").fill(`e2e-repeat-${unique}@example.com`);
    await page.getByTestId("input-message").fill("Second submission after reset.");
    await page.waitForTimeout(2500);

    await page.getByTestId("btn-send-message").click();
    await expect(page.getByText("Message sent!")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("btn-send-another").click();
    // Form should be back with empty fields and a working submit button.
    await expect(page.getByTestId("form-contact")).toBeVisible();
    await expect(name).toHaveValue("");
  });
});
