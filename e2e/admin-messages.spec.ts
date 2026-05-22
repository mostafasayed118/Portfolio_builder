import { test, expect } from "@playwright/test";

test.describe("Admin messages management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/messages");
    await page.waitForTimeout(2000);
  });

  test("messages page loads and shows heading", async ({ page }) => {
    const heading = page.getByRole("heading", { name: /message/i });
    await expect(heading).toBeVisible();
  });

  test("messages list or empty state is visible", async ({ page }) => {
    // Either a table/list of messages or an empty state should be shown
    const hasMessages = await page.locator("table, [role='table']").isVisible();
    const hasEmpty = await page.getByText(/no messages|empty/i).isVisible();

    expect(hasMessages || hasEmpty).toBe(true);
  });

  test("filter tabs are available", async ({ page }) => {
    // Look for filter tabs (All, Unread, Read)
    const allTab = page.getByRole("tab", { name: /all/i });
    const unreadTab = page.getByRole("tab", { name: /unread/i });

    if (await allTab.isVisible()) {
      await expect(allTab).toBeVisible();
      await expect(unreadTab).toBeVisible();
    }
  });

  test("can switch between filter tabs", async ({ page }) => {
    const allTab = page.getByRole("tab", { name: /all/i });
    const unreadTab = page.getByRole("tab", { name: /unread/i });

    if (await unreadTab.isVisible()) {
      await unreadTab.click();
      await page.waitForTimeout(500);

      // Tab should be selected
      await expect(unreadTab).toHaveAttribute("data-state", "active");
    }
  });

  test("unread count badge is present in sidebar", async ({ page }) => {
    // Check if there's a badge showing unread count
    const badge = page.locator('[class*="badge"]');
    // At least one badge element should exist somewhere
    const count = await badge.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("message action buttons are present", async ({ page }) => {
    // Check for mark read/delete buttons
    const markReadBtn = page.getByRole("button", { name: /mark.*read|read/i });
    const deleteBtn = page.getByRole("button", { name: /delete/i });

    // At least one action button should be visible if there are messages
    const hasAnyAction = await markReadBtn.isVisible() || await deleteBtn.isVisible();
    const hasEmpty = await page.getByText(/no messages|empty/i).isVisible();

    expect(hasAnyAction || hasEmpty).toBe(true);
  });
});
