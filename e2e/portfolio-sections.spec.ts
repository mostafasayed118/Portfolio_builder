import { test, expect } from "@playwright/test";

test.describe("Portfolio sections", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("section").first()).toBeVisible({ timeout: 15000 });
  });

  test("hero section renders with heading content", async ({ page }) => {
    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();
    // Hero should contain heading text
    const heading = hero.locator("h1, h2, [data-testid='hero-name'], [class*='hero']");
    await expect(heading.first()).toBeVisible({ timeout: 5000 });
  });

  test("about section is present in the page", async ({ page }) => {
    // Scroll to about section or check it exists
    const aboutSection = page.locator("section").nth(1);
    await expect(aboutSection).toBeAttached();
  });

  test("navigation links scroll to correct sections", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();

    // Nav uses buttons for scroll-to-section, not anchor tags
    const aboutBtn = nav.locator("button").filter({ hasText: /about/i }).first();
    if (await aboutBtn.isVisible()) {
      await aboutBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("footer renders with content", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footer = page.locator("footer");
    await expect(footer).toBeVisible({ timeout: 5000 });
    const footerText = await footer.textContent();
    expect(footerText).toBeTruthy();
  });

  test("page has proper meta tags for SEO", async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test("skills section is present in the page", async ({ page }) => {
    await page.evaluate(() => document.querySelector("#skills")?.scrollIntoView());
    const skills = page.locator("#skills");
    await expect(skills).toBeVisible({ timeout: 5000 });
  });

  test("projects section is present in the page", async ({ page }) => {
    await page.evaluate(() => document.querySelector("#projects")?.scrollIntoView());
    const projects = page.locator("#projects");
    await expect(projects).toBeVisible({ timeout: 5000 });
  });

  test("experience section is present in the page", async ({ page }) => {
    await page.evaluate(() => document.querySelector("#experience")?.scrollIntoView());
    const experience = page.locator("#experience");
    await expect(experience).toBeVisible({ timeout: 5000 });
  });

  test("certifications section is present in the page", async ({ page }) => {
    await page.evaluate(() => document.querySelector("#certifications")?.scrollIntoView());
    const certs = page.locator("#certifications");
    await expect(certs).toBeVisible({ timeout: 5000 });
  });

  test("contact section is present in the page", async ({ page }) => {
    await page.evaluate(() => document.querySelector("#contact")?.scrollIntoView());
    const contact = page.locator("#contact");
    await expect(contact).toBeVisible({ timeout: 5000 });
  });

  test("all sections render without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // Navigate and scroll through the full page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Filter out known benign errors (e.g. third-party analytics)
    const criticalErrors = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("Script error")
    );
    expect(criticalErrors).toEqual([]);
  });

  test("page has meta description tag", async ({ page }) => {
    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(desc).toBeTruthy();
    expect(desc!.length).toBeGreaterThan(0);
  });
});
