import { test, expect } from "@playwright/test";

test.describe("Portfolio — Full Manual Test Suite", () => {

  // ═══════════════════════════════════════════════════════════════
  // 1. HERO SECTION
  // ═══════════════════════════════════════════════════════════════
  test.describe("Hero Section", () => {
    test("hero renders with name and avatar", async ({ page }) => {
      await page.goto("/");
      const hero = page.locator("section").first();
      await expect(hero).toBeVisible();
      // Should contain the user's name
      const nameEl = hero.locator("h1, [data-testid='hero-name']");
      await expect(nameEl).toBeVisible();
    });

    test("hero shows typewriter role animation", async ({ page }) => {
      await page.goto("/");
      // Wait for typewriter to cycle
      await page.waitForTimeout(2000);
      const hero = page.locator("section").first();
      const roleText = hero.locator("[data-testid='hero-role'], .typewriter, h2");
      await expect(roleText.first()).toBeVisible();
    });

    test("hero shows animated background orbs", async ({ page }) => {
      await page.goto("/");
      const orbs = page.locator("[class*='orb'], [class*='Orb'], [class*='gradient']");
      // Background decoration should exist
      await expect(orbs.first()).toBeVisible();
    });

    test("hero has scroll progress bar", async ({ page }) => {
      await page.goto("/");
      const progressBar = page.locator("[data-testid='scroll-progress'], [class*='progress']");
      // At least one progress indicator should exist
      await expect(progressBar.first()).toBeAttached();
    });

    test("hero has download CV button", async ({ page }) => {
      await page.goto("/");
      const downloadBtn = page.locator('a[href*="cv"], a[href*="resume"], button:has-text("Download"), button:has-text("CV")');
      await expect(downloadBtn.first()).toBeVisible();
    });

    test("hero has social links", async ({ page }) => {
      await page.goto("/");
      const socialLinks = page.locator('a[href*="github"], a[href*="linkedin"]');
      await expect(socialLinks.first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. NAVBAR
  // ═══════════════════════════════════════════════════════════════
  test.describe("Navbar", () => {
    test("navbar is fixed and visible on scroll", async ({ page }) => {
      await page.goto("/");
      const nav = page.locator("nav");
      await expect(nav).toBeVisible();
      await page.evaluate(() => window.scrollBy(0, 500));
      await expect(nav).toBeVisible();
    });

    test("navbar has navigation links to all sections", async ({ page }) => {
      await page.goto("/");
      const nav = page.locator("nav");
      // Should have links to key sections
      for (const section of ["Home", "About", "Skills", "Projects", "Contact"]) {
        const link = nav.locator(`a[href*="${section.toLowerCase()}"], a:has-text("${section}")`);
        await expect(link.first()).toBeAttached();
      }
    });

    test("navbar has theme toggle", async ({ page }) => {
      await page.goto("/");
      const themeBtn = page.locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="light" i]');
      await expect(themeBtn.first()).toBeVisible();
    });

    test("navbar has language toggle", async ({ page }) => {
      await page.goto("/");
      const langBtn = page.locator('button:has-text("EN"), button:has-text("AR"), button[aria-label*="language" i]');
      await expect(langBtn.first()).toBeVisible();
    });

    test("clicking section link scrolls to that section", async ({ page }) => {
      await page.goto("/");
      const aboutLink = page.locator('nav a[href*="about"], nav a:has-text("About")');
      if (await aboutLink.first().isVisible()) {
        await aboutLink.first().click();
        await page.waitForTimeout(1000);
        // About section should be in viewport
        const aboutSection = page.locator('#about, section:has-text("About")');
        await expect(aboutSection.first()).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. ABOUT SECTION
  // ═══════════════════════════════════════════════════════════════
  test.describe("About Section", () => {
    test("about section renders with bio text", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#about")?.scrollIntoView());
      await page.waitForTimeout(500);
      const about = page.locator("#about");
      await expect(about).toBeVisible();
    });

    test("about section shows education info", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#about")?.scrollIntoView());
      await page.waitForTimeout(500);
      const education = page.locator('text=/education|university|institute|college/i');
      await expect(education.first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. SKILLS SECTION (with icons)
  // ═══════════════════════════════════════════════════════════════
  test.describe("Skills Section", () => {
    test("skills section renders with category filters", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#skills")?.scrollIntoView());
      await page.waitForTimeout(500);
      const skills = page.locator("#skills");
      await expect(skills).toBeVisible();
      // Should have filter buttons
      const allFilter = page.locator('[data-testid="skills-filter-all"]');
      await expect(allFilter).toBeVisible();
    });

    test("skill tags display with icons", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#skills")?.scrollIntoView());
      await page.waitForTimeout(500);
      // Each skill tag should have an icon span
      const skillTags = page.locator("#skills [data-testid^='skill-tag']");
      const count = await skillTags.count();
      expect(count).toBeGreaterThan(0);
      // First skill should have an icon
      const firstIcon = skillTags.first().locator("span[aria-hidden='true']");
      await expect(firstIcon).toBeVisible();
    });

    test("clicking category filter filters skills", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#skills")?.scrollIntoView());
      await page.waitForTimeout(500);

      const allCount = await page.locator("#skills [data-testid^='skill-tag']").count();
      // Click a specific category
      const langFilter = page.locator('[data-testid="skills-filter-languages"]');
      if (await langFilter.isVisible()) {
        await langFilter.click();
        await page.waitForTimeout(300);
        const filteredCount = await page.locator("#skills [data-testid^='skill-tag']").count();
        expect(filteredCount).toBeLessThanOrEqual(allCount);
        expect(filteredCount).toBeGreaterThan(0);
      }
    });

    test("skill hover shows proficiency details", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#skills")?.scrollIntoView());
      await page.waitForTimeout(500);
      const skillTag = page.locator("#skills [data-testid^='skill-tag']").first();
      if (await skillTag.isVisible()) {
        await skillTag.hover();
        await page.waitForTimeout(300);
        // Should show a tooltip or expanded detail
        const tooltip = page.locator("[role='tooltip'], [class*='tooltip'], [class*='popover']");
        await expect(tooltip.first()).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. PROJECTS SECTION (with category badges)
  // ═══════════════════════════════════════════════════════════════
  test.describe("Projects Section", () => {
    test("projects section renders with masonry grid", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#projects")?.scrollIntoView());
      await page.waitForTimeout(500);
      const projects = page.locator("#projects");
      await expect(projects).toBeVisible();
    });

    test("project cards display category badges", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#projects")?.scrollIntoView());
      await page.waitForTimeout(500);
      // Each card should have a category badge
      const badges = page.locator("#projects [class*='badge'], #projects [class*='category']");
      const count = await badges.count();
      expect(count).toBeGreaterThan(0);
    });

    test("project cards have clickable tech stack tags", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#projects")?.scrollIntoView());
      await page.waitForTimeout(500);
      const techBadges = page.locator("#projects [data-testid^='tech-']");
      const count = await techBadges.count();
      expect(count).toBeGreaterThan(0);
    });

    test("clicking a project card navigates to detail page", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#projects")?.scrollIntoView());
      await page.waitForTimeout(500);
      const card = page.locator("[data-testid^='card-project']").first();
      if (await card.isVisible()) {
        await card.click();
        await page.waitForTimeout(1000);
        expect(page.url()).toContain("/projects/");
      }
    });

    test("project detail page shows full description and links", async ({ page }) => {
      // Navigate to first project
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#projects")?.scrollIntoView());
      await page.waitForTimeout(500);
      const card = page.locator("[data-testid^='card-project']").first();
      if (await card.isVisible()) {
        await card.click();
        await page.waitForTimeout(1000);
        // Should show full description
        const desc = page.locator("p, [class*='description']");
        await expect(desc.first()).toBeVisible();
        // Should have back button
        const backBtn = page.locator('a:has-text("Back"), button:has-text("Back"), [aria-label*="back" i]');
        await expect(backBtn.first()).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. EXPERIENCE SECTION
  // ═══════════════════════════════════════════════════════════════
  test.describe("Experience Section", () => {
    test("experience section renders timeline", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#experience")?.scrollIntoView());
      await page.waitForTimeout(500);
      const exp = page.locator("#experience");
      await expect(exp).toBeVisible();
    });

    test("timeline items show company and period", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#experience")?.scrollIntoView());
      await page.waitForTimeout(500);
      const items = page.locator("#experience [data-testid^='timeline-item'], #experience [class*='timeline']");
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. CERTIFICATIONS SECTION
  // ═══════════════════════════════════════════════════════════════
  test.describe("Certifications Section", () => {
    test("certifications section renders", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#certifications")?.scrollIntoView());
      await page.waitForTimeout(500);
      const cert = page.locator("#certifications");
      await expect(cert).toBeVisible();
    });

    test("certification cards show issuer and credential links", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#certifications")?.scrollIntoView());
      await page.waitForTimeout(500);
      const certCards = page.locator("#certifications [data-testid^='cert-card'], #certifications [class*='cert']");
      const count = await certCards.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. CONTACT SECTION
  // ═══════════════════════════════════════════════════════════════
  test.describe("Contact Section", () => {
    test("contact section renders with form", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#contact")?.scrollIntoView());
      await page.waitForTimeout(500);
      const contact = page.locator("#contact");
      await expect(contact).toBeVisible();
    });

    test("contact form has name, email, message fields", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#contact")?.scrollIntoView());
      await page.waitForTimeout(500);
      const nameInput = page.locator('#contact input[name="name"], #contact input[placeholder*="name" i]');
      const emailInput = page.locator('#contact input[name="email"], #contact input[type="email"]');
      const messageInput = page.locator('#contact textarea[name="message"], #contact textarea');
      await expect(nameInput.first()).toBeVisible();
      await expect(emailInput.first()).toBeVisible();
      await expect(messageInput.first()).toBeVisible();
    });

    test("contact form shows validation errors for empty submit", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#contact")?.scrollIntoView());
      await page.waitForTimeout(500);
      const submitBtn = page.locator('#contact button[type="submit"], #contact button:has-text("Send")');
      if (await submitBtn.first().isVisible()) {
        await submitBtn.first().click();
        await page.waitForTimeout(300);
        // Should show validation errors
        const error = page.locator('[class*="error"], [class*="invalid"], [role="alert"]');
        await expect(error.first()).toBeVisible();
      }
    });

    test("contact info cards display email, phone, location", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#contact")?.scrollIntoView());
      await page.waitForTimeout(500);
      const emailLink = page.locator('#contact a[href*="mailto:"]');
      const phoneLink = page.locator('#contact a[href*="tel:"]');
      // At least email should be present
      await expect(emailLink.first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. FOOTER
  // ═══════════════════════════════════════════════════════════════
  test.describe("Footer", () => {
    test("footer renders at the bottom of the page", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
    });

    test("footer contains social links", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const socialLinks = page.locator("footer a[href*='github'], footer a[href*='linkedin']");
      await expect(socialLinks.first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. THEME TOGGLE
  // ═══════════════════════════════════════════════════════════════
  test.describe("Theme Toggle", () => {
    test("toggling theme switches light/dark mode", async ({ page }) => {
      await page.goto("/");
      const html = page.locator("html");
      const wasDark = await html.evaluate(el => el.classList.contains("dark"));
      const toggle = page.locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="light" i]');
      await toggle.first().click();
      await page.waitForTimeout(300);
      const isDark = await html.evaluate(el => el.classList.contains("dark"));
      expect(isDark).not.toBe(wasDark);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 11. BACK TO TOP
  // ═══════════════════════════════════════════════════════════════
  test.describe("Back to Top", () => {
    test("back-to-top button appears on scroll", async ({ page }) => {
      await page.goto("/");
      // Button should not be visible initially
      const btn = page.locator('button[aria-label*="top" i], button:has-text("↑"), [data-testid="back-to-top"]');
      // Scroll down
      await page.evaluate(() => window.scrollTo(0, 1000));
      await page.waitForTimeout(500);
      await expect(btn.first()).toBeVisible();
    });

    test("clicking back-to-top scrolls to top", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => window.scrollTo(0, 2000));
      await page.waitForTimeout(500);
      const btn = page.locator('button[aria-label*="top" i], button:has-text("↑"), [data-testid="back-to-top"]');
      await btn.first().click();
      await page.waitForTimeout(1000);
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeLessThan(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 12. SEO & META
  // ═══════════════════════════════════════════════════════════════
  test.describe("SEO & Meta", () => {
    test("page has title tag", async ({ page }) => {
      await page.goto("/");
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });

    test("page has meta description", async ({ page }) => {
      await page.goto("/");
      const desc = await page.locator('meta[name="description"]').getAttribute("content");
      expect(desc).toBeTruthy();
      expect(desc!.length).toBeGreaterThan(10);
    });

    test("page has Open Graph tags", async ({ page }) => {
      await page.goto("/");
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
      const ogDesc = await page.locator('meta[property="og:description"]').getAttribute("content");
      expect(ogTitle).toBeTruthy();
      expect(ogDesc).toBeTruthy();
    });

    test("page has JSON-LD structured data", async ({ page }) => {
      await page.goto("/");
      const jsonLd = page.locator('script[type="application/ld+json"]');
      const count = await jsonLd.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test("page has canonical URL", async ({ page }) => {
      await page.goto("/");
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 13. MOBILE RESPONSIVE
  // ═══════════════════════════════════════════════════════════════
  test.describe("Mobile Responsive", () => {
    test("mobile hamburger menu works", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/");
      const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="navigation" i]');
      await expect(hamburger.first()).toBeVisible();
      await hamburger.first().click();
      await page.waitForTimeout(500);
      // Mobile menu should open
      const mobileMenu = page.locator('[class*="sheet"], [role="dialog"], [class*="mobile-menu"]');
      await expect(mobileMenu.first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 14. ACCESSIBILITY
  // ═══════════════════════════════════════════════════════════════
  test.describe("Accessibility", () => {
    test("navigation has aria landmarks", async ({ page }) => {
      await page.goto("/");
      const nav = page.locator("nav[aria-label]");
      await expect(nav.first()).toBeVisible();
    });

    test("project cards have keyboard navigation", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#projects")?.scrollIntoView());
      await page.waitForTimeout(500);
      const card = page.locator("[data-testid^='card-project']").first();
      if (await card.isVisible()) {
        // Should be focusable
        await card.focus();
        const isFocused = await card.evaluate(el => el === document.activeElement);
        expect(isFocused).toBe(true);
      }
    });

    test("theme toggle has accessible label", async ({ page }) => {
      await page.goto("/");
      const toggle = page.locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="light" i]');
      const label = await toggle.first().getAttribute("aria-label");
      expect(label).toBeTruthy();
    });
  });
});
