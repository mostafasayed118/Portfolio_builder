import { test, expect } from "@playwright/test";

/**
 * E2E coverage for the Blog feature (portfolio app).
 *
 * Flows covered:
 *   - /blog listing page renders heading + subtitle
 *   - footer "Blog" link navigates from the home page to /blog
 *   - empty state is shown when no published posts exist
 *   - "Home" button on /blog navigates back to the home page
 *   - /blog/:slug renders the "Post Not Found" state for an unknown slug,
 *     and the "Back to Blog" link returns to /blog
 *   - the blog routes mount without fatal console errors
 */

test.describe("Portfolio blog", () => {
  test("blog listing page loads with heading and subtitle", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: /^Blog$/ })).toBeVisible();
    await expect(page.getByText(/Ideas and articles on data engineering/i)).toBeVisible();
  });

  test("footer blog link on the home page navigates to /blog", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    const blogLink = page.getByTestId("footer-link-blog");
    await expect(blogLink).toBeAttached();
    // The footer link is hidden below the `sm` breakpoint (responsive design),
    // so on the mobile project navigate directly instead of clicking.
    if (await blogLink.isVisible()) {
      await blogLink.click();
      await page.waitForURL("**/blog");
    } else {
      await page.goto("/blog");
    }
    await expect(page.getByRole("heading", { name: /^Blog$/ })).toBeVisible();
  });

  test("blog listing shows posts or the empty state", async ({ page }) => {
    await page.goto("/blog");
    // Live-data aware: dev/prod databases have published posts, a fresh one
    // has none. Wait for the loading skeleton to resolve, then assert the
    // state the real data is in — never hardcode which.
    const emptyState = page.getByText("No posts yet");
    const firstCard = page.locator('a[href^="/blog/"]').first();
    await Promise.race([
      expect(emptyState).toBeVisible({ timeout: 15_000 }),
      expect(firstCard).toBeVisible({ timeout: 15_000 }),
    ]);
    if (await emptyState.isVisible()) {
      await expect(page.getByText(/Check back soon for new articles/i)).toBeVisible();
    } else {
      await expect(firstCard).toBeVisible();
    }
  });

  test("home button on the blog page navigates back to the home page", async ({ page }) => {
    await page.goto("/blog");
    const homeBtn = page.getByRole("button", { name: "Home" });
    await expect(homeBtn).toBeVisible();
    await homeBtn.click();
    await page.waitForURL((url) => url.pathname === "/");
    // The desktop navbar is hidden on small viewports — assert on the home
    // hero section instead, which is viewport-independent.
    await expect(page.locator("section").first()).toBeVisible();
  });

  test("unknown post slug renders the not-found state with working back link", async ({ page }) => {
    await page.goto("/blog/this-post-definitely-does-not-exist-xyz");
    // The not-found state renders only after the post lookup resolves — auto-
    // retry with a generous timeout (Supabase can be slow under parallel load).
    await expect(page.getByRole("heading", { name: /Post Not Found/i })).toBeVisible({ timeout: 15_000 });
    const backLink = page.getByRole("link", { name: /Back to Blog/i });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await page.waitForURL("**/blog");
    await expect(page.getByRole("heading", { name: /^Blog$/ })).toBeVisible();
  });

  test("blog pages mount without fatal console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await page.goto("/blog");
    await page.goto("/blog/this-post-definitely-does-not-exist-xyz");

    const fatalErrors = consoleErrors.filter(
      (e) => !/favicon|net::|ERR_|failed to load resource/i.test(e),
    );
    expect(fatalErrors, `Unexpected console errors:\n${fatalErrors.join("\n")}`).toEqual([]);
  });
});
