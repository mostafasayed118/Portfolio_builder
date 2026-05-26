# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-full.spec.ts >> Admin Panel — Full Manual Test Suite >> Command Palette >> command palette has Quick Actions group
- Location: e2e\admin-full.spec.ts:133:9

# Error details

```
Error: expect(locator).toBeAttached() failed

Locator: locator('[role="dialog"] [cmdk-group-heading]:has-text("Quick Actions")')
Expected: attached
Timeout: 3000ms
Error: element(s) not found

Call log:
  - Expect "toBeAttached" with timeout 3000ms
  - waiting for locator('[role="dialog"] [cmdk-group-heading]:has-text("Quick Actions")')

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
  - /url: https://nearby-koi-38.accounts.dev/sign-up?__clerk_db_jwt=dvb_3EE6xuX0joG5toWAudZpBDH7gRL
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
  39  |       const group = page.locator("text=Dashboard");
  40  |       await expect(group.first()).toBeAttached({ timeout: 10000 });
  41  |     });
  42  | 
  43  |     test("sidebar has Content group items", async ({ page }) => {
  44  |       await page.goto("/");
  45  |       for (const item of ["Hero", "About", "Projects", "Skills", "Experience", "Certifications"]) {
  46  |         const link = page.locator(`a:has-text("${item}")`);
  47  |         await expect(link.first()).toBeAttached({ timeout: 10000 });
  48  |       }
  49  |     });
  50  | 
  51  |     test("sidebar has Inbox group with Messages", async ({ page }) => {
  52  |       await page.goto("/");
  53  |       const messagesLink = page.locator('a:has-text("Messages")');
  54  |       await expect(messagesLink.first()).toBeAttached({ timeout: 10000 });
  55  |     });
  56  | 
  57  |     test("sidebar has Site group items", async ({ page }) => {
  58  |       await page.goto("/");
  59  |       for (const item of ["CV", "SEO", "Typography", "Section", "Theme", "Settings"]) {
  60  |         const link = page.locator(`a:has-text("${item}")`);
  61  |         await expect(link.first()).toBeAttached({ timeout: 10000 });
  62  |       }
  63  |     });
  64  | 
  65  |     test("sidebar highlights active page with visual indicator", async ({ page }) => {
  66  |       await page.goto("/");
  67  |       const activeLink = page.locator('a[aria-current="page"], a[class*="bg-sidebar-primary"]');
  68  |       await expect(activeLink.first()).toBeAttached({ timeout: 10000 });
  69  |     });
  70  | 
  71  |     test("header renders with page title", async ({ page }) => {
  72  |       await page.goto("/");
  73  |       const header = page.locator("header");
  74  |       await expect(header).toBeVisible({ timeout: 10000 });
  75  |     });
  76  | 
  77  |     test("header has theme toggle button", async ({ page }) => {
  78  |       await page.goto("/");
  79  |       const themeBtn = page.locator(
  80  |         'header button[aria-label*="theme" i], header button[aria-label*="dark" i], header button[aria-label*="light" i]'
  81  |       );
  82  |       await expect(themeBtn.first()).toBeVisible({ timeout: 10000 });
  83  |     });
  84  | 
  85  |     test("header has user menu with sign-out", async ({ page }) => {
  86  |       await page.goto("/");
  87  |       const userMenu = page.locator('header button:has-text("@"), header [class*="user"]');
  88  |       await expect(userMenu.first()).toBeAttached({ timeout: 10000 });
  89  |     });
  90  | 
  91  |     test("View Live Portfolio link opens external URL", async ({ page }) => {
  92  |       await page.goto("/");
  93  |       const liveLink = page.locator(
  94  |         'a:has-text("View Live Portfolio"), a:has-text("Live Portfolio")'
  95  |       );
  96  |       if (await liveLink.first().isVisible()) {
  97  |         const href = await liveLink.first().getAttribute("href");
  98  |         expect(href).toBeTruthy();
  99  |         expect(href).toContain("http");
  100 |       }
  101 |     });
  102 |   });
  103 | 
  104 |   // ═══════════════════════════════════════════════════════════════
  105 |   // 3. COMMAND PALETTE (Ctrl+K)
  106 |   // ═══════════════════════════════════════════════════════════════
  107 |   test.describe("Command Palette", () => {
  108 |     test("Ctrl+K opens command palette", async ({ page }) => {
  109 |       await page.goto("/");
  110 |       await page.keyboard.press("Control+k");
  111 | 
  112 |       const dialog = page.locator('[role="dialog"], [cmdk-root], [class*="command"]');
  113 |       await expect(dialog.first()).toBeVisible({ timeout: 3000 });
  114 |     });
  115 | 
  116 |     test("command palette has search input", async ({ page }) => {
  117 |       await page.goto("/");
  118 |       await page.keyboard.press("Control+k");
  119 |       const input = page.locator('[role="dialog"] input, [cmdk-input]');
  120 |       await expect(input.first()).toBeVisible({ timeout: 3000 });
  121 |     });
  122 | 
  123 |     test("command palette lists navigation items", async ({ page }) => {
  124 |       await page.goto("/");
  125 |       await page.keyboard.press("Control+k");
  126 | 
  127 |       for (const item of ["Overview", "Hero", "Projects", "Skills", "SEO", "Theme"]) {
  128 |         const cmdItem = page.locator(`[role="dialog"] [cmdk-item]:has-text("${item}")`);
  129 |         await expect(cmdItem.first()).toBeAttached({ timeout: 3000 });
  130 |       }
  131 |     });
  132 | 
  133 |     test("command palette has Quick Actions group", async ({ page }) => {
  134 |       await page.goto("/");
  135 |       await page.keyboard.press("Control+k");
  136 |       const group = page.locator(
  137 |         '[role="dialog"] [cmdk-group-heading]:has-text("Quick Actions")'
  138 |       );
> 139 |       await expect(group).toBeAttached({ timeout: 3000 });
      |                           ^ Error: expect(locator).toBeAttached() failed
  140 |     });
  141 | 
  142 |     test("typing in command palette filters results", async ({ page }) => {
  143 |       await page.goto("/");
  144 |       await page.keyboard.press("Control+k");
  145 |       const input = page.locator('[role="dialog"] input, [cmdk-input]');
  146 |       await expect(input.first()).toBeVisible({ timeout: 3000 });
  147 |       await input.first().fill("theme");
  148 | 
  149 |       // The Theme item should still be visible
  150 |       const themeItem = page.locator('[role="dialog"] [cmdk-item]:has-text("Theme")');
  151 |       await expect(themeItem.first()).toBeVisible({ timeout: 3000 });
  152 |     });
  153 | 
  154 |     test("Escape closes command palette", async ({ page }) => {
  155 |       await page.goto("/");
  156 |       await page.keyboard.press("Control+k");
  157 |       const dialog = page.locator('[role="dialog"]');
  158 |       await expect(dialog.first()).toBeVisible({ timeout: 3000 });
  159 | 
  160 |       await page.keyboard.press("Escape");
  161 |       await expect(dialog.first()).not.toBeVisible({ timeout: 3000 });
  162 |     });
  163 | 
  164 |     test("header search button opens command palette", async ({ page }) => {
  165 |       await page.goto("/");
  166 |       const searchBtn = page.locator(
  167 |         'header button:has-text("Search"), header button[aria-label*="command palette" i]'
  168 |       );
  169 |       if (await searchBtn.first().isVisible()) {
  170 |         await searchBtn.first().click();
  171 |         const dialog = page.locator('[role="dialog"]');
  172 |         await expect(dialog.first()).toBeVisible({ timeout: 3000 });
  173 |       }
  174 |     });
  175 |   });
  176 | 
  177 |   // ═══════════════════════════════════════════════════════════════
  178 |   // 4. SIDEBAR NAVIGATION
  179 |   // ═══════════════════════════════════════════════════════════════
  180 |   test.describe("Sidebar Navigation", () => {
  181 |     const navItems = [
  182 |       { label: "Overview", url: "/overview" },
  183 |       { label: "Hero", url: "/hero" },
  184 |       { label: "About", url: "/about" },
  185 |       { label: "Projects", url: "/projects" },
  186 |       { label: "Skills", url: "/skills" },
  187 |       { label: "Experience", url: "/experience" },
  188 |       { label: "Certifications", url: "/certifications" },
  189 |       { label: "Messages", url: "/messages" },
  190 |       { label: "CV", url: "/cv" },
  191 |       { label: "SEO", url: "/seo" },
  192 |       { label: "Typography", url: "/typography" },
  193 |       { label: "Section", url: "/sections" },
  194 |       { label: "Theme", url: "/theme" },
  195 |       { label: "Settings", url: "/settings" },
  196 |     ];
  197 | 
  198 |     for (const item of navItems) {
  199 |       test(`can navigate to ${item.label} page`, async ({ page }) => {
  200 |         await page.goto("/");
  201 | 
  202 |         const link = page.locator(`nav a:has-text("${item.label}"), aside a:has-text("${item.label}")`);
  203 |         await expect(link.first()).toBeAttached({ timeout: 10000 });
  204 | 
  205 |         if (await link.first().isVisible()) {
  206 |           await link.first().click();
  207 |           await expect(page).toHaveURL(new RegExp(item.url), { timeout: 10000 });
  208 |         }
  209 |       });
  210 |     }
  211 |   });
  212 | 
  213 |   // ═══════════════════════════════════════════════════════════════
  214 |   // 5. OVERVIEW DASHBOARD
  215 |   // ═══════════════════════════════════════════════════════════════
  216 |   test.describe("Overview Dashboard", () => {
  217 |     test("overview shows stat cards", async ({ page }) => {
  218 |       await page.goto("/overview");
  219 |       const cards = page.locator("[class*='card'], [class*='stat']");
  220 |       await expect(cards.first()).toBeAttached({ timeout: 10000 });
  221 |     });
  222 | 
  223 |     test("overview shows module grid with links to sections", async ({ page }) => {
  224 |       await page.goto("/overview");
  225 |       const moduleLinks = page.locator(
  226 |         'a[href*="/hero"], a[href*="/projects"], a[href*="/skills"]'
  227 |       );
  228 |       const count = await moduleLinks.count();
  229 |       expect(count).toBeGreaterThan(0);
  230 |     });
  231 |   });
  232 | 
  233 |   // ═══════════════════════════════════════════════════════════════
  234 |   // 6. HERO EDITOR
  235 |   // ═══════════════════════════════════════════════════════════════
  236 |   test.describe("Hero Editor", () => {
  237 |     test("hero editor page loads with form fields", async ({ page }) => {
  238 |       await page.goto("/hero");
  239 |       const form = page.locator("form, [class*='form'], input");
```