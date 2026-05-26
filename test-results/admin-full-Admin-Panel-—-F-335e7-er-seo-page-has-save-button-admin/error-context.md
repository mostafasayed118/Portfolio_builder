# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-full.spec.ts >> Admin Panel — Full Manual Test Suite >> SEO Manager >> seo page has save button
- Location: e2e\admin-full.spec.ts:348:9

# Error details

```
Error: expect(locator).toBeAttached() failed

Locator: locator('button:has-text("Save"), button[data-save-button]').first()
Expected: attached
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeAttached" with timeout 10000ms
  - waiting for locator('button:has-text("Save"), button[data-save-button]').first()

```

```yaml
- heading "Sign in to build your portfolio" [level=1]
- paragraph: Welcome back! Please sign in to continue
- button "Sign in with Google Continue with Google":
  - img "Sign in with Google"
  - text: Continue with Google
- paragraph: or
- text: Email address
- textbox "Email address":
  - /placeholder: Enter your email address
- text: Password
- textbox "Password":
  - /placeholder: Enter your password
- button "Show password":
  - img
- button "Continue":
  - text: Continue
  - img
- text: Don’t have an account?
- link "Sign up":
  - /url: https://nearby-koi-38.accounts.dev/sign-up?__clerk_db_jwt=dvb_3EE70JFAGEUIj91RLOCLy8BdKOi
- paragraph: Secured by
- link "Clerk logo":
  - /url: https://go.clerk.com/components
  - img
- paragraph: Development mode
- region "Notifications (F8)":
  - list
```

# Test source

```ts
  251 |   // 7. PROJECTS MANAGER
  252 |   // ═══════════════════════════════════════════════════════════════
  253 |   test.describe("Projects Manager", () => {
  254 |     test("projects page loads with content or empty state", async ({ page }) => {
  255 |       await page.goto("/projects");
  256 |       const content = page.locator("table, [class*='empty'], [class*='card'], [class*='list']");
  257 |       await expect(content.first()).toBeAttached({ timeout: 10000 });
  258 |     });
  259 | 
  260 |     test("projects page has add/create button", async ({ page }) => {
  261 |       await page.goto("/projects");
  262 |       const addBtn = page.locator(
  263 |         'button:has-text("Add"), button:has-text("Create"), button:has-text("New")'
  264 |       );
  265 |       await expect(addBtn.first()).toBeAttached({ timeout: 10000 });
  266 |     });
  267 |   });
  268 | 
  269 |   // ═══════════════════════════════════════════════════════════════
  270 |   // 8. SKILLS MANAGER
  271 |   // ═══════════════════════════════════════════════════════════════
  272 |   test.describe("Skills Manager", () => {
  273 |     test("skills page loads with content", async ({ page }) => {
  274 |       await page.goto("/skills");
  275 |       const content = page.locator("table, [class*='empty'], [class*='card'], input");
  276 |       await expect(content.first()).toBeAttached({ timeout: 10000 });
  277 |     });
  278 | 
  279 |     test("skills page has add button", async ({ page }) => {
  280 |       await page.goto("/skills");
  281 |       const addBtn = page.locator(
  282 |         'button:has-text("Add"), button:has-text("Create"), button:has-text("New")'
  283 |       );
  284 |       await expect(addBtn.first()).toBeAttached({ timeout: 10000 });
  285 |     });
  286 |   });
  287 | 
  288 |   // ═══════════════════════════════════════════════════════════════
  289 |   // 9. EXPERIENCE MANAGER
  290 |   // ═══════════════════════════════════════════════════════════════
  291 |   test.describe("Experience Manager", () => {
  292 |     test("experience page loads with content", async ({ page }) => {
  293 |       await page.goto("/experience");
  294 |       const content = page.locator("table, [class*='empty'], [class*='card'], input");
  295 |       await expect(content.first()).toBeAttached({ timeout: 10000 });
  296 |     });
  297 |   });
  298 | 
  299 |   // ═══════════════════════════════════════════════════════════════
  300 |   // 10. CERTIFICATIONS MANAGER
  301 |   // ═══════════════════════════════════════════════════════════════
  302 |   test.describe("Certifications Manager", () => {
  303 |     test("certifications page loads with content", async ({ page }) => {
  304 |       await page.goto("/certifications");
  305 |       const content = page.locator("table, [class*='empty'], [class*='card'], input");
  306 |       await expect(content.first()).toBeAttached({ timeout: 10000 });
  307 |     });
  308 |   });
  309 | 
  310 |   // ═══════════════════════════════════════════════════════════════
  311 |   // 11. MESSAGES MANAGER
  312 |   // ═══════════════════════════════════════════════════════════════
  313 |   test.describe("Messages Manager", () => {
  314 |     test("messages page loads with content or empty state", async ({ page }) => {
  315 |       await page.goto("/messages");
  316 |       const content = page.locator(
  317 |         "table, [class*='empty'], [class*='card'], [class*='message']"
  318 |       );
  319 |       await expect(content.first()).toBeAttached({ timeout: 10000 });
  320 |     });
  321 |   });
  322 | 
  323 |   // ═══════════════════════════════════════════════════════════════
  324 |   // 12. CV MANAGER
  325 |   // ═══════════════════════════════════════════════════════════════
  326 |   test.describe("CV Manager", () => {
  327 |     test("cv page loads with upload controls", async ({ page }) => {
  328 |       await page.goto("/cv");
  329 |       const content = page.locator(
  330 |         "input[type='file'], button:has-text('Upload'), [class*='card']"
  331 |       );
  332 |       await expect(content.first()).toBeAttached({ timeout: 10000 });
  333 |     });
  334 |   });
  335 | 
  336 |   // ═══════════════════════════════════════════════════════════════
  337 |   // 13. SEO MANAGER
  338 |   // ═══════════════════════════════════════════════════════════════
  339 |   test.describe("SEO Manager", () => {
  340 |     test("seo page loads with form fields", async ({ page }) => {
  341 |       await page.goto("/seo");
  342 |       const inputs = page.locator("input, textarea");
  343 |       await expect(inputs.first()).toBeAttached({ timeout: 10000 });
  344 |       const count = await inputs.count();
  345 |       expect(count).toBeGreaterThan(0);
  346 |     });
  347 | 
  348 |     test("seo page has save button", async ({ page }) => {
  349 |       await page.goto("/seo");
  350 |       const saveBtn = page.locator('button:has-text("Save"), button[data-save-button]');
> 351 |       await expect(saveBtn.first()).toBeAttached({ timeout: 10000 });
      |                                     ^ Error: expect(locator).toBeAttached() failed
  352 |     });
  353 |   });
  354 | 
  355 |   // ═══════════════════════════════════════════════════════════════
  356 |   // 14. TYPOGRAPHY MANAGER
  357 |   // ═══════════════════════════════════════════════════════════════
  358 |   test.describe("Typography Manager", () => {
  359 |     test("typography page loads with controls", async ({ page }) => {
  360 |       await page.goto("/typography");
  361 |       const content = page.locator("select, input, [class*='card']");
  362 |       await expect(content.first()).toBeAttached({ timeout: 10000 });
  363 |     });
  364 |   });
  365 | 
  366 |   // ═══════════════════════════════════════════════════════════════
  367 |   // 15. SECTION ORDER MANAGER
  368 |   // ═══════════════════════════════════════════════════════════════
  369 |   test.describe("Section Order Manager", () => {
  370 |     test("sections page loads with reorder controls", async ({ page }) => {
  371 |       await page.goto("/sections");
  372 |       const content = page.locator(
  373 |         "[class*='drag'], [class*='section'], [class*='item'], table"
  374 |       );
  375 |       await expect(content.first()).toBeAttached({ timeout: 10000 });
  376 |     });
  377 |   });
  378 | 
  379 |   // ═══════════════════════════════════════════════════════════════
  380 |   // 16. THEME MANAGER
  381 |   // ═══════════════════════════════════════════════════════════════
  382 |   test.describe("Theme Manager", () => {
  383 |     test("theme page loads with color pickers", async ({ page }) => {
  384 |       await page.goto("/theme");
  385 |       const content = page.locator(
  386 |         "input[type='color'], input[type='text'], [class*='color'], [class*='picker']"
  387 |       );
  388 |       await expect(content.first()).toBeAttached({ timeout: 10000 });
  389 |     });
  390 | 
  391 |     test("theme page has save button", async ({ page }) => {
  392 |       await page.goto("/theme");
  393 |       const saveBtn = page.locator('button:has-text("Save"), button[data-save-button]');
  394 |       await expect(saveBtn.first()).toBeAttached({ timeout: 10000 });
  395 |     });
  396 |   });
  397 | 
  398 |   // ═══════════════════════════════════════════════════════════════
  399 |   // 17. SITE SETTINGS
  400 |   // ═══════════════════════════════════════════════════════════════
  401 |   test.describe("Site Settings", () => {
  402 |     test("settings page loads with form fields", async ({ page }) => {
  403 |       await page.goto("/settings");
  404 |       const inputs = page.locator("input, textarea");
  405 |       await expect(inputs.first()).toBeAttached({ timeout: 10000 });
  406 |       const count = await inputs.count();
  407 |       expect(count).toBeGreaterThan(0);
  408 |     });
  409 |   });
  410 | 
  411 |   // ═══════════════════════════════════════════════════════════════
  412 |   // 18. DARK MODE IN ADMIN
  413 |   // ═══════════════════════════════════════════════════════════════
  414 |   test.describe("Admin Dark Mode", () => {
  415 |     test("toggling dark mode works in admin", async ({ page }) => {
  416 |       await page.goto("/");
  417 |       const html = page.locator("html");
  418 |       const wasDark = await html.evaluate(el => el.classList.contains("dark"));
  419 | 
  420 |       const toggle = page.locator(
  421 |         'header button[aria-label*="theme" i], header button[aria-label*="dark" i], header button[aria-label*="light" i]'
  422 |       );
  423 |       await expect(toggle.first()).toBeVisible({ timeout: 10000 });
  424 | 
  425 |       if (await toggle.first().isVisible()) {
  426 |         await toggle.first().click();
  427 |         const isDark = await html.evaluate(el => el.classList.contains("dark"));
  428 |         expect(isDark).not.toBe(wasDark);
  429 |       }
  430 |     });
  431 |   });
  432 | 
  433 |   // ═══════════════════════════════════════════════════════════════
  434 |   // 19. KEYBOARD SHORTCUTS
  435 |   // ═══════════════════════════════════════════════════════════════
  436 |   test.describe("Keyboard Shortcuts", () => {
  437 |     test("Ctrl+/ focuses search input on pages with search", async ({ page }) => {
  438 |       await page.goto("/skills");
  439 |       await page.keyboard.press("Control+/");
  440 | 
  441 |       const searchInput = page.locator(
  442 |         '[data-search-input], input[placeholder*="search" i]'
  443 |       );
  444 |       if (await searchInput.first().isVisible()) {
  445 |         const isFocused = await searchInput.first().evaluate(el => el === document.activeElement);
  446 |         expect(isFocused).toBe(true);
  447 |       }
  448 |     });
  449 | 
  450 |     test("Escape closes open dialogs", async ({ page }) => {
  451 |       await page.goto("/");
```