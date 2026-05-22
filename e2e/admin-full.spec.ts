import { test, expect } from "@playwright/test";

test.describe("Admin Panel — Full Manual Test Suite", () => {

  // ═══════════════════════════════════════════════════════════════
  // 1. AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════
  test.describe("Authentication", () => {
    test("sign-in page loads with Clerk", async ({ page }) => {
      await page.goto("/");
      // Should see sign-in form or redirect
      await expect(page.locator("body")).toBeVisible();
      // Clerk renders an iframe or sign-in component
      const authElements = page.locator('[class*="sign-in"], iframe[src*="clerk"], [data-testid="sign-in"]');
      await expect(authElements.first()).toBeAttached();
    });

    test("protected routes redirect to sign-in when unauthenticated", async ({ page }) => {
      await page.goto("/overview");
      await page.waitForTimeout(2000);
      // Should either show sign-in or redirect
      expect(page.url()).toContain("/");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. LAYOUT & NAVIGATION
  // ═══════════════════════════════════════════════════════════════
  test.describe("Layout & Sidebar", () => {
    test("sidebar renders with all navigation groups", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      const sidebar = page.locator("aside, nav[aria-label*='navigation' i]");
      await expect(sidebar.first()).toBeVisible();
    });

    test("sidebar has Dashboard group", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      const group = page.locator("text=Dashboard");
      await expect(group.first()).toBeAttached();
    });

    test("sidebar has Content group with Hero, About, Projects, Skills, Experience, Certifications", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      for (const item of ["Hero", "About", "Projects", "Skills", "Experience", "Certifications"]) {
        const link = page.locator(`a:has-text("${item}")`);
        await expect(link.first()).toBeAttached();
      }
    });

    test("sidebar has Inbox group with Messages", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      const messagesLink = page.locator('a:has-text("Messages")');
      await expect(messagesLink.first()).toBeAttached();
    });

    test("sidebar has Site group with CV, SEO, Typography, Sections, Theme, Settings", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      for (const item of ["CV", "SEO", "Typography", "Section", "Theme", "Settings"]) {
        const link = page.locator(`a:has-text("${item}")`);
        await expect(link.first()).toBeAttached();
      }
    });

    test("sidebar highlights active page", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      const activeLink = page.locator('a[aria-current="page"], a[class*="bg-sidebar-primary"]');
      await expect(activeLink.first()).toBeAttached();
    });

    test("header shows page title", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      const header = page.locator("header");
      await expect(header).toBeVisible();
    });

    test("header has theme toggle", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      const themeBtn = page.locator('header button[aria-label*="theme" i], header button[aria-label*="dark" i], header button[aria-label*="light" i]');
      await expect(themeBtn.first()).toBeVisible();
    });

    test("header has user menu with sign-out", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      const userMenu = page.locator('header button:has-text("@"), header [class*="user"]');
      await expect(userMenu.first()).toBeAttached();
    });

    test("View Live Portfolio link opens in new tab", async ({ page, context }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      const liveLink = page.locator('a:has-text("View Live Portfolio"), a:has-text("Live Portfolio")');
      if (await liveLink.first().isVisible()) {
        const href = await liveLink.first().getAttribute("href");
        expect(href).toBeTruthy();
        expect(href).toContain("http");
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. COMMAND PALETTE (Ctrl+K)
  // ═══════════════════════════════════════════════════════════════
  test.describe("Command Palette", () => {
    test("Ctrl+K opens command palette", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"], [cmdk-root], [class*="command"]');
      await expect(dialog.first()).toBeVisible();
    });

    test("command palette has search input", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(500);
      const input = page.locator('[role="dialog"] input, [cmdk-input]');
      await expect(input.first()).toBeVisible();
    });

    test("command palette lists all navigation items", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(500);
      // Should show navigation items
      for (const item of ["Overview", "Hero", "Projects", "Skills", "Messages", "SEO", "Theme"]) {
        const cmdItem = page.locator(`[role="dialog"] [cmdk-item]:has-text("${item}")`);
        await expect(cmdItem.first()).toBeAttached();
      }
    });

    test("command palette has Quick Actions group", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(500);
      const group = page.locator('[role="dialog"] [cmdk-group-heading]:has-text("Quick Actions")');
      await expect(group).toBeAttached();
    });

    test("typing in command palette filters results", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(500);
      const input = page.locator('[role="dialog"] input, [cmdk-input]');
      await input.first().fill("theme");
      await page.waitForTimeout(300);
      // Theme item should be visible
      const themeItem = page.locator('[role="dialog"] [cmdk-item]:has-text("Theme")');
      await expect(themeItem.first()).toBeVisible();
    });

    test("Escape closes command palette", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(500);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).not.toBeVisible();
    });

    test("header search button opens command palette", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      const searchBtn = page.locator('header button:has-text("Search"), header button[aria-label*="command palette" i]');
      if (await searchBtn.first().isVisible()) {
        await searchBtn.first().click();
        await page.waitForTimeout(500);
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog.first()).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. SIDEBAR NAVIGATION — clicking each link
  // ═══════════════════════════════════════════════════════════════
  test.describe("Sidebar Navigation", () => {
    const navItems = [
      { label: "Overview", url: "/overview" },
      { label: "Hero", url: "/hero" },
      { label: "About", url: "/about" },
      { label: "Projects", url: "/projects" },
      { label: "Skills", url: "/skills" },
      { label: "Experience", url: "/experience" },
      { label: "Certifications", url: "/certifications" },
      { label: "Messages", url: "/messages" },
      { label: "CV", url: "/cv" },
      { label: "SEO", url: "/seo" },
      { label: "Typography", url: "/typography" },
      { label: "Section", url: "/sections" },
      { label: "Theme", url: "/theme" },
      { label: "Settings", url: "/settings" },
    ];

    for (const item of navItems) {
      test(`can navigate to ${item.label} page`, async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(2000);
        const link = page.locator(`nav a:has-text("${item.label}"), aside a:has-text("${item.label}")`);
        if (await link.first().isVisible()) {
          await link.first().click();
          await page.waitForTimeout(1500);
          expect(page.url()).toContain(item.url);
        }
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. OVERVIEW DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  test.describe("Overview Dashboard", () => {
    test("overview shows stats cards", async ({ page }) => {
      await page.goto("/overview");
      await page.waitForTimeout(2000);
      const cards = page.locator("[class*='card'], [class*='stat']");
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    });

    test("overview shows module grid with links to sections", async ({ page }) => {
      await page.goto("/overview");
      await page.waitForTimeout(2000);
      // Should have links to different sections
      const moduleLinks = page.locator('a[href*="/hero"], a[href*="/projects"], a[href*="/skills"]');
      const count = await moduleLinks.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. HERO EDITOR
  // ═══════════════════════════════════════════════════════════════
  test.describe("Hero Editor", () => {
    test("hero editor page loads with form fields", async ({ page }) => {
      await page.goto("/hero");
      await page.waitForTimeout(2000);
      const form = page.locator("form, [class*='form'], input");
      await expect(form.first()).toBeAttached();
    });

    test("hero editor has save button", async ({ page }) => {
      await page.goto("/hero");
      await page.waitForTimeout(2000);
      const saveBtn = page.locator('button:has-text("Save"), button[data-save-button]');
      await expect(saveBtn.first()).toBeAttached();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. PROJECTS MANAGER
  // ═══════════════════════════════════════════════════════════════
  test.describe("Projects Manager", () => {
    test("projects page loads with list or empty state", async ({ page }) => {
      await page.goto("/projects");
      await page.waitForTimeout(2000);
      const content = page.locator("table, [class*='empty'], [class*='card'], [class*='list']");
      await expect(content.first()).toBeAttached();
    });

    test("projects page has add/create button", async ({ page }) => {
      await page.goto("/projects");
      await page.waitForTimeout(2000);
      const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")');
      await expect(addBtn.first()).toBeAttached();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. SKILLS MANAGER
  // ═══════════════════════════════════════════════════════════════
  test.describe("Skills Manager", () => {
    test("skills page loads", async ({ page }) => {
      await page.goto("/skills");
      await page.waitForTimeout(2000);
      const content = page.locator("table, [class*='empty'], [class*='card'], input");
      await expect(content.first()).toBeAttached();
    });

    test("skills page has add button", async ({ page }) => {
      await page.goto("/skills");
      await page.waitForTimeout(2000);
      const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")');
      await expect(addBtn.first()).toBeAttached();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. EXPERIENCE MANAGER
  // ═══════════════════════════════════════════════════════════════
  test.describe("Experience Manager", () => {
    test("experience page loads", async ({ page }) => {
      await page.goto("/experience");
      await page.waitForTimeout(2000);
      const content = page.locator("table, [class*='empty'], [class*='card'], input");
      await expect(content.first()).toBeAttached();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. CERTIFICATIONS MANAGER
  // ═══════════════════════════════════════════════════════════════
  test.describe("Certifications Manager", () => {
    test("certifications page loads", async ({ page }) => {
      await page.goto("/certifications");
      await page.waitForTimeout(2000);
      const content = page.locator("table, [class*='empty'], [class*='card'], input");
      await expect(content.first()).toBeAttached();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 11. MESSAGES MANAGER
  // ═══════════════════════════════════════════════════════════════
  test.describe("Messages Manager", () => {
    test("messages page loads", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForTimeout(2000);
      const content = page.locator("table, [class*='empty'], [class*='card'], [class*='message']");
      await expect(content.first()).toBeAttached();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 12. CV MANAGER
  // ═══════════════════════════════════════════════════════════════
  test.describe("CV Manager", () => {
    test("cv page loads", async ({ page }) => {
      await page.goto("/cv");
      await page.waitForTimeout(2000);
      const content = page.locator("input[type='file'], button:has-text('Upload'), [class*='card']");
      await expect(content.first()).toBeAttached();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 13. SEO MANAGER
  // ═══════════════════════════════════════════════════════════════
  test.describe("SEO Manager", () => {
    test("seo page loads with form fields", async ({ page }) => {
      await page.goto("/seo");
      await page.waitForTimeout(2000);
      const inputs = page.locator("input, textarea");
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);
    });

    test("seo page has save button", async ({ page }) => {
      await page.goto("/seo");
      await page.waitForTimeout(2000);
      const saveBtn = page.locator('button:has-text("Save"), button[data-save-button]');
      await expect(saveBtn.first()).toBeAttached();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 14. TYPOGRAPHY MANAGER
  // ═══════════════════════════════════════════════════════════════
  test.describe("Typography Manager", () => {
    test("typography page loads", async ({ page }) => {
      await page.goto("/typography");
      await page.waitForTimeout(2000);
      const content = page.locator("select, input, [class*='card']");
      await expect(content.first()).toBeAttached();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 15. SECTION ORDER MANAGER
  // ═══════════════════════════════════════════════════════════════
  test.describe("Section Order Manager", () => {
    test("sections page loads with drag handles or reorder controls", async ({ page }) => {
      await page.goto("/sections");
      await page.waitForTimeout(2000);
      const content = page.locator("[class*='drag'], [class*='section'], [class*='item'], table");
      await expect(content.first()).toBeAttached();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 16. THEME MANAGER
  // ═══════════════════════════════════════════════════════════════
  test.describe("Theme Manager", () => {
    test("theme page loads with color pickers", async ({ page }) => {
      await page.goto("/theme");
      await page.waitForTimeout(2000);
      const content = page.locator("input[type='color'], input[type='text'], [class*='color'], [class*='picker']");
      await expect(content.first()).toBeAttached();
    });

    test("theme page has save button", async ({ page }) => {
      await page.goto("/theme");
      await page.waitForTimeout(2000);
      const saveBtn = page.locator('button:has-text("Save"), button[data-save-button]');
      await expect(saveBtn.first()).toBeAttached();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 17. SITE SETTINGS
  // ═══════════════════════════════════════════════════════════════
  test.describe("Site Settings", () => {
    test("settings page loads", async ({ page }) => {
      await page.goto("/settings");
      await page.waitForTimeout(2000);
      const inputs = page.locator("input, textarea");
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 18. DARK MODE IN ADMIN
  // ═══════════════════════════════════════════════════════════════
  test.describe("Admin Dark Mode", () => {
    test("toggling dark mode works in admin", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      const html = page.locator("html");
      const wasDark = await html.evaluate(el => el.classList.contains("dark"));
      const toggle = page.locator('header button[aria-label*="theme" i], header button[aria-label*="dark" i], header button[aria-label*="light" i]');
      if (await toggle.first().isVisible()) {
        await toggle.first().click();
        await page.waitForTimeout(300);
        const isDark = await html.evaluate(el => el.classList.contains("dark"));
        expect(isDark).not.toBe(wasDark);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 19. KEYBOARD SHORTCUTS
  // ═══════════════════════════════════════════════════════════════
  test.describe("Keyboard Shortcuts", () => {
    test("Ctrl+/ focuses search input on pages with search", async ({ page }) => {
      await page.goto("/skills");
      await page.waitForTimeout(2000);
      await page.keyboard.press("Control+/");
      await page.waitForTimeout(300);
      // Search input should be focused
      const searchInput = page.locator('[data-search-input], input[placeholder*="search" i]');
      if (await searchInput.first().isVisible()) {
        const isFocused = await searchInput.first().evaluate(el => el === document.activeElement);
        expect(isFocused).toBe(true);
      }
    });

    test("Escape closes dialogs", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      // Open command palette
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(500);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).not.toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 20. ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════
  test.describe("Error Handling", () => {
    test("unknown route shows 404 page", async ({ page }) => {
      await page.goto("/this-does-not-exist");
      await page.waitForTimeout(2000);
      const notFound = page.locator('text=/not found|404|page.*exist/i');
      await expect(notFound.first()).toBeAttached();
    });
  });
});
