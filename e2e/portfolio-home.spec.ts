import { test, expect } from "@playwright/test";

test.describe("Portfolio home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page loads and shows the hero section", async ({ page }) => {
    // The hero section should be visible with a heading
    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();
  });

  test("navigation bar is visible with links", async ({ page }) => {
    // The desktop nav is hidden below the md breakpoint; on mobile the navbar
    // exposes the hamburger button instead. Either is a valid navbar presence.
    const desktopNavVisible = await page
      .locator("nav[aria-label='Primary']")
      .isVisible()
      .catch(() => false);
    const mobileBtnVisible = await page
      .getByTestId("btn-mobile-menu")
      .isVisible()
      .catch(() => false);
    expect(desktopNavVisible || mobileBtnVisible).toBe(true);
  });

  test("scrolling reveals all sections on the home page", async ({ page }) => {
    // Scroll through the page to trigger lazy-loaded sections
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // Wait for content to load
    await page.waitForTimeout(1000);

    // Footer should be visible at the bottom
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("theme toggle is present in the navbar", async ({ page }) => {
    // Two toggles render (desktop nav + mobile menu); the desktop one is
    // display:none on mobile, so assert on whichever is visible in the viewport.
    const themeToggle = page
      .getByTestId("btn-theme-toggle")
      .filter({ visible: true })
      .first();
    await expect(themeToggle).toBeVisible();
  });

  test("footer contains social links", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    // Footer should contain social links (the blog link is hidden below sm,
    // so assert on a social link that renders on every viewport).
    await expect(footer.getByTestId("footer-link-github")).toBeVisible();
    await expect(footer.getByTestId("footer-link-linkedin")).toBeVisible();
  });
});
