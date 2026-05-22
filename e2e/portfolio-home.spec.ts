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
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
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
    // Look for a theme toggle button (sun/moon icon or similar)
    const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="light" i]');
    // At least one theme-related button should exist
    await expect(themeToggle.first()).toBeVisible();
  });

  test("footer contains social links", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    // Footer should contain at least one link
    const links = footer.locator("a");
    await expect(links.first()).toBeVisible();
  });
});
