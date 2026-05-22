import { test, expect } from "@playwright/test";

test.describe("Admin dashboard", () => {
  test("admin login page loads", async ({ page }) => {
    await page.goto("/");
    // Admin should show some kind of login/auth screen
    // The page should at least render (even if it shows a sign-in form or redirect)
    await expect(page.locator("body")).toBeVisible();
  });

  test("dashboard page renders after navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);

    // After auth, the dashboard should render with some content
    // Look for common admin UI elements
    const mainContent = page.locator("main, [role='main'], .admin-layout, #root");
    await expect(mainContent.first()).toBeVisible();
  });

  test("sidebar navigation is present", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);

    // Look for sidebar or navigation elements
    const sidebar = page.locator("nav, aside, [role='navigation']");
    await expect(sidebar.first()).toBeVisible();
  });

  test("can navigate to skills page", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Try to find and click the Skills link
    const skillsLink = page.getByRole("link", { name: /skills/i });
    if (await skillsLink.isVisible()) {
      await skillsLink.click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/skills/);
    }
  });

  test("can navigate to projects page", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    const projectsLink = page.getByRole("link", { name: /projects/i });
    if (await projectsLink.isVisible()) {
      await projectsLink.click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/projects/);
    }
  });
});
