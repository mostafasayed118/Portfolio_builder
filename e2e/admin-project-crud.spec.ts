import { test, expect } from "@playwright/test";

test.describe("Admin project CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects");
    await page.waitForTimeout(2000);
  });

  test("projects page loads and shows heading", async ({ page }) => {
    const heading = page.getByRole("heading", { name: /project/i });
    await expect(heading).toBeVisible();
  });

  test("create project button is visible", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /add|create|new.*project/i });
    await expect(createBtn).toBeVisible();
  });

  test("can open create project dialog", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /add|create|new.*project/i });
    await createBtn.click();
    await page.waitForTimeout(500);

    // A dialog/modal should appear
    const dialog = page.locator('[role="dialog"], .dialog, [data-state="open"]');
    await expect(dialog.first()).toBeVisible();
  });

  test("create dialog has title and description fields", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /add|create|new.*project/i });
    await createBtn.click();
    await page.waitForTimeout(500);

    const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]');
    const descInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]');

    await expect(titleInput).toBeVisible();
    await expect(descInput).toBeVisible();
  });

  test("can fill in project form fields", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /add|create|new.*project/i });
    await createBtn.click();
    await page.waitForTimeout(500);

    const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]');
    const descInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]');

    await titleInput.fill("E2E Test Project");
    await descInput.fill("This is an end-to-end test project created by Playwright.");

    await expect(titleInput).toHaveValue("E2E Test Project");
  });

  test("form validates required title field", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /add|create|new.*project/i });
    await createBtn.click();
    await page.waitForTimeout(500);

    // Try to submit without filling in the title
    const submitBtn = page.getByRole("button", { name: /save|create|submit/i }).last();
    await submitBtn.click();
    await page.waitForTimeout(500);

    // Dialog should still be open (form didn't submit)
    const dialog = page.locator('[role="dialog"], .dialog, [data-state="open"]');
    await expect(dialog.first()).toBeVisible();
  });

  test("can close create dialog with cancel or escape", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /add|create|new.*project/i });
    await createBtn.click();
    await page.waitForTimeout(500);

    // Press Escape to close
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // Dialog should be closed
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).not.toBeVisible();
  });
});
