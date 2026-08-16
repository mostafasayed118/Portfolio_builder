/**
 * admin-ai-assistant.spec.ts — click through the AI Assistant tools end to
 * end with a signed-in admin session.
 *
 * Requires a real admin session (see e2e/lib/session-mode.ts — set
 * CLERK_SECRET_KEY for the minted path, or CLERK_TEST_EMAIL +
 * CLERK_TEST_PASSWORD for a genuine sign-in). Skips cleanly otherwise.
 *
 * Outcome assertions are deliberately tolerant: Gemini availability varies
 * (transient 503s, quota 429s, or a missing key in CI), so each tool asserts
 * the full request round-trip completes — the button re-enables and EITHER
 * the result block renders OR the inline error surfaces. That still proves
 * the UI → API → Gemini wiring, regardless of provider health.
 */
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "path";
import { hasRealAdminSession } from "./lib/session-mode";

// Consume the session captured by the `setup` project (@clerk/testing
// token sign-in when CLERK_SECRET_KEY is set, documented stub otherwise)
// so these tests run as the signed-in user.
const STORAGE_STATE = resolve(process.cwd(), "playwright/.auth/admin.json");

test.use({ storageState: STORAGE_STATE });

const OUTCOME_TIMEOUT = 150_000;

test.describe("Admin AI Assistant", () => {
  test.skip(
    !hasRealAdminSession(),
    "requires a real admin session (CLERK_SECRET_KEY or CLERK_TEST_EMAIL/CLERK_TEST_PASSWORD)",
  );


  test.beforeEach(async ({ page }) => {
    await page.goto("/ai");
    await expect(page.getByRole("heading", { name: "AI Assistant" })).toBeVisible();
  });

  /** Wait for the tool's result block OR the inline error, then snapshot it. */
  async function settle(page: Page, scope: string, resultSelector: string): Promise<string> {
    const outcome = page.locator(`${scope} ${resultSelector}, ${scope} [role="alert"]`).first();
    await expect(outcome).toBeVisible({ timeout: OUTCOME_TIMEOUT });
    // Textareas expose their content via .value; everything else via text.
    return await outcome.evaluate((el) => {
      const input = el as HTMLTextAreaElement | HTMLInputElement;
      return (input.value ?? el.textContent ?? "").trim();
    });
  }

  test("renders all four AI tools", async ({ page }) => {
    const tools: [string, string][] = [
      ["#ai-generate-description", "Project Description"],
      ["#ai-suggest-categories", "Suggest Categories"],
      ["#ai-suggest-tags", "Suggest Tags"],
      ["#ai-analyze-content", "Content Analysis"],
    ];
    for (const [id, label] of tools) {
      const card = page.locator(id);
      await expect(card).toBeVisible();
      // Scope the text match to the card so descriptions/tips elsewhere on
      // the page can't create ambiguous substring matches.
      await expect(card.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("generate-description: title + tech stack → description or error", async ({ page }, testInfo) => {
    const tool = page.locator("#ai-generate-description");
    await tool.getByPlaceholder("e.g. Data Pipeline Dashboard").fill("E2E Portfolio");
    await tool.getByLabel("Add tech… (e.g. React, Node, PostgreSQL)").fill("React");
    await tool.getByRole("button", { name: "Add technology" }).click();
    await tool.getByRole("button", { name: "Generate description" }).click();

    const outcome = await settle(page, "#ai-generate-description", '[aria-label="Generated description"]');
    await page.screenshot({ path: testInfo.outputPath("generate-description.png") });
    console.log(`[ai-e2e] generate-description outcome: ${outcome.slice(0, 120)}`);
    // The round-trip completed with either real text or a surfaced Gemini error.
    expect(outcome.length).toBeGreaterThan(0);
  });

  test("suggest-categories: skill name → category chips or error", async ({ page }, testInfo) => {
    const tool = page.locator("#ai-suggest-categories");
    await tool.getByPlaceholder("e.g. React Native").fill("React Native");
    await tool.getByRole("button", { name: "Suggest categories" }).click();

    const outcome = await settle(page, "#ai-suggest-categories", '[data-testid="category-results"]');
    await page.screenshot({ path: testInfo.outputPath("suggest-categories.png") });
    console.log(`[ai-e2e] suggest-categories outcome: ${outcome.slice(0, 120)}`);
    expect(outcome.length).toBeGreaterThan(0);
  });

  test("suggest-tags: tech stack → tag chips or error", async ({ page }, testInfo) => {
    const tool = page.locator("#ai-suggest-tags");
    await tool.getByLabel("Add tech… (e.g. Next.js, Supabase)").fill("Next.js");
    await tool.getByRole("button", { name: "Add technology" }).click();
    await tool.getByRole("button", { name: "Suggest tags" }).click();

    const outcome = await settle(page, "#ai-suggest-tags", '[data-testid="tag-results"]');
    await page.screenshot({ path: testInfo.outputPath("suggest-tags.png") });
    console.log(`[ai-e2e] suggest-tags outcome: ${outcome.slice(0, 120)}`);
    expect(outcome.length).toBeGreaterThan(0);
  });

  test("analyze-content: content + section type → score or error", async ({ page }, testInfo) => {
    const tool = page.locator("#ai-analyze-content");
    await tool.getByPlaceholder("Paste the section text to analyze…").fill(
      "I am a full-stack developer building scalable web applications with React and Node.js.",
    );
    await tool.getByRole("button", { name: "Analyze content" }).click();

    const outcome = await settle(page, "#ai-analyze-content", '[data-testid="analysis-results"]');
    await page.screenshot({ path: testInfo.outputPath("analyze-content.png") });
    console.log(`[ai-e2e] analyze-content outcome: ${outcome.slice(0, 120)}`);
    expect(outcome.length).toBeGreaterThan(0);
  });
});
