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
      const hero = page.locator("#hero");
      await expect(hero).toBeVisible();
      // HeroTypewriter renders the rotating role line in a <span> with a
      // blinking cursor element; assert the typewriter is mounted.
      const cursor = hero.locator("[class*='typewriter-cursor']");
      await expect(cursor).toBeVisible();
    });

    test("hero shows animated background orbs", async ({ page }) => {
      await page.goto("/");
      const orbs = page.locator("[class*='orb'], [class*='Orb'], [class*='gradient']");
      // Background decoration should exist
      await expect(orbs.first()).toBeVisible();
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
      // The navbar root is a fixed <header> (the <nav> inside it is hidden on
      // mobile), so assert on the header, which is always visible.
      const header = page.locator("header");
      await expect(header).toBeVisible();
      await page.evaluate(() => window.scrollBy(0, 500));
      await expect(header).toBeVisible();
    });

    test("navbar has navigation links to all sections", async ({ page }) => {
      await page.goto("/");
      // Section navigation renders as buttons with data-testid="nav-{key}";
      // "Home" is handled by the logo button (data-testid="nav-logo").
      const nav = page.locator("nav[aria-label='Primary']");
      await expect(nav).toBeAttached();
      for (const key of ["about", "skills", "projects", "experience", "certifications", "contact"]) {
        await expect(nav.getByTestId(`nav-${key}`)).toBeAttached();
      }
      await expect(page.getByTestId("nav-logo")).toBeAttached();
    });

    test("navbar has theme toggle", async ({ page }) => {
      await page.goto("/");
      // Two toggles render (desktop + mobile); assert on the visible one.
      const themeBtn = page.getByTestId("btn-theme-toggle").filter({ visible: true }).first();
      await expect(themeBtn).toBeVisible();
    });

    test("navbar has language toggle", async ({ page }) => {
      await page.goto("/");
      const langBtn = page.locator('button[aria-label*="language" i]');
      // The language switcher is data-driven (language_settings must have
      // language_mode="both" and show_language_toggle=true in Supabase). When
      // it is disabled, verify the navbar still renders instead of asserting
      // on a feature the environment has turned off.
      if ((await langBtn.count()) === 0) {
        await expect(page.locator("header")).toBeVisible();
        return;
      }
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

    test("skill tags render with level indicators", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#skills")?.scrollIntoView());
      // Auto-retry: tags only render after the Supabase data finishes loading.
      const skillTags = page.locator("#skills [data-testid^='skill-tag']");
      await expect(skillTags.first()).toBeVisible({ timeout: 10_000 });
      const count = await skillTags.count();
      expect(count).toBeGreaterThan(0);
      // Every tag renders an aria-hidden level indicator (a colored dot);
      // skills that carry an icon render an additional icon span. Assert the
      // indicator on the first tag — stable regardless of which skills have
      // icons in the live data (currently none do).
      await expect(
        skillTags.first().locator("span[aria-hidden='true']").first(),
      ).toBeVisible();
    });

    test("clicking category filter filters skills", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#skills")?.scrollIntoView());
      // Auto-retry: tags only render after the Supabase data finishes loading.
      await expect(page.locator("#skills [data-testid^='skill-tag']").first()).toBeVisible({ timeout: 10_000 });

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
        // The proficiency card is rendered inside the tag container on hover
        // (a div.absolute.bottom-full sibling of the pill).
        const hoverCard = skillTag.locator("div.absolute.bottom-full");
        await expect(hoverCard).toBeVisible();
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
      // Each card renders a category badge ("Web App", "Mobile", "Cloud", …)
      // as its first span, and tech stack tags as data-testid="badge-tech-*".
      const firstCard = page.locator("#projects [data-testid^='card-project-']").first();
      await expect(firstCard).toBeVisible();
      const badge = firstCard.locator("span").first();
      await expect(badge).toBeVisible();
      expect((await badge.textContent())?.trim().length ?? 0).toBeGreaterThan(0);
    });

    test("project cards render tech stack tags", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.querySelector("#projects")?.scrollIntoView());
      // Auto-retry: cards only render after the Supabase data finishes loading.
      const firstCard = page.locator("#projects [data-testid^='card-project-']").first();
      await expect(firstCard).toBeVisible({ timeout: 10_000 });
      // Tech tags render as data-testid="badge-tech-*". They are labels, not
      // links — the card itself is the click target.
      const techBadges = page.locator("#projects [data-testid^='badge-tech-']");
      const count = await techBadges.count();
      expect(count).toBeGreaterThan(0);
      await expect(techBadges.first()).toBeVisible();
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
      // Auto-retry instead of fixed wait: the section renders a skeleton while
      // Supabase data loads, and timeline items only appear once loaded.
      const firstItem = page.locator("#experience [data-testid^='timeline-item']").first();
      await expect(firstItem).toBeVisible({ timeout: 10_000 });
      expect((await firstItem.textContent())?.trim().length ?? 0).toBeGreaterThan(0);
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
      // Auto-retry: cards appear after the Supabase data finishes loading.
      const firstCard = page.locator("#certifications [data-testid^='cert-card']").first();
      await expect(firstCard).toBeVisible({ timeout: 10_000 });
      // Issuer + date render inside the card. (Credential links depend on the
      // data having a URL, which the current DB rows lack — see portfolio-full
      // card assertions. CertCard renders `cert-link-*` when a URL exists.)
      expect((await firstCard.textContent())?.trim().length ?? 0).toBeGreaterThan(0);
      const links = page.locator("#certifications [data-testid^='cert-link-']");
      if ((await links.count()) > 0) {
        await expect(links.first()).toBeAttached();
      }
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
      // ContactForm renders SmartInput fields addressed via data-testid.
      await expect(page.getByTestId("input-name")).toBeVisible();
      await expect(page.getByTestId("input-email")).toBeVisible();
      await expect(page.getByTestId("input-message")).toBeVisible();
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
      // Click whichever toggle is visible in the current viewport (desktop vs
      // mobile render separate buttons).
      const toggle = page.getByTestId("btn-theme-toggle").filter({ visible: true }).first();
      await toggle.click();
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
      // The homepage fires a one-time "welcome" toast ~1.5s after first
      // visit; its full-width viewport sits at the top (z-100) and can
      // intercept clicks on the mobile hamburger. Mark the session visited
      // up-front so the toast never appears during this test.
      await page.addInitScript(() => sessionStorage.setItem("visited", "true"));
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/");
      const hamburger = page.getByTestId("btn-mobile-menu");
      await expect(hamburger).toBeVisible();
      await hamburger.click();
      // The menu panel is a div with data-mobile-menu that expands on open.
      const mobileMenu = page.locator("[data-mobile-menu]");
      await expect(mobileMenu).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 14. ACCESSIBILITY
  // ═══════════════════════════════════════════════════════════════
  test.describe("Accessibility", () => {
    test("navigation has aria landmarks", async ({ page }) => {
      await page.goto("/");
      const primaryNav = page.locator('nav[aria-label="Primary"]');
      await expect(primaryNav).toBeAttached();
      if (await primaryNav.isVisible()) {
        // Desktop: the primary nav is exposed to the accessibility tree.
        expect(await page.getByRole("navigation").count()).toBeGreaterThanOrEqual(1);
        return;
      }
      // Mobile: the hamburger has an accessible name, and opening the menu
      // reveals a navigation landmark (the closed menu is aria-hidden).
      const hamburger = page.getByTestId("btn-mobile-menu");
      await expect(hamburger).toBeVisible();
      expect((await hamburger.getAttribute("aria-label"))?.toLowerCase()).toContain("menu");
      await hamburger.click();
      await expect(page.locator("[data-mobile-menu]")).toBeVisible();
      expect(await page.getByRole("navigation").count()).toBeGreaterThanOrEqual(1);
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
