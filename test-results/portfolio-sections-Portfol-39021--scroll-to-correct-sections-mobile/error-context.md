# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: portfolio-sections.spec.ts >> Portfolio sections >> navigation links scroll to correct sections
- Location: e2e\portfolio-sections.spec.ts:23:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('nav')
Expected: visible
Received: hidden
Timeout:  10000ms

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('nav')
    21 × locator resolved to <nav class="hidden md:flex items-center gap-1">…</nav>
       - unexpected value "hidden"

```

```yaml
- banner:
  - button "Mustafa Sayed"
  - button "Toggle theme"
  - button "Open navigation menu"
  - text: Theme set to
  - strong: Light mode
  - button "Undo"
  - button "Dismiss theme sync banner": Dismiss
  - navigation "Mobile navigation":
    - button "About"
    - button "Skills"
    - button "Projects"
    - button "Experience"
    - button "Certifications"
    - button "Contact"
- main:
  - text: Available for work
  - heading "Hi, I'm Mustafa Sayed" [level=1]
  - text: Pip Cairo, Egypt
  - paragraph: Passionate about building scalable data pipelines, transforming raw data into actionable insights, and architecting robust ETL solutions.
  - link "Get In Touch":
    - /url: "#contact"
  - link "View Projects":
    - /url: "#projects"
  - link "Download CV":
    - /url: http://localhost:3001/api/v1/cv
  - link "GitHub":
    - /url: https://github.com/mustafasayed
  - link "LinkedIn":
    - /url: https://linkedin.com/in/mustafasayed
  - link "Email":
    - /url: mailto:mustafasayedsaeed@outlook.com
  - text: MS Data Engineer
  - button "Scroll down": Read More
  - text: About Me
  - heading "About Me" [level=2]
  - paragraph: I'm a Data Engineer with 1+ years of hands-on experience building production ETL pipelines, data warehouses, and BI dashboards that power business decisions.
  - paragraph: I'm a Data Engineer with 1+ years of hands-on experience building production ETL pipelines, data warehouses, and BI dashboards that power business decisions.
  - paragraph: I enjoy the full data lifecycle — from raw ingestion through Apache Kafka and Airflow, to clean warehouse models in Snowflake, to interactive Tableau dashboards that tell the story clearly.
  - text: Education
  - paragraph: B.Sc. Statistics & Computer Science
  - paragraph: Ain Shams University
  - text: Very Good 2020 – 2024 Languages Beginner Beginner Beginner Cairo, Egypt 1+ yrs Experience
  - heading "Skills & Expertise" [level=3]
  - text: Web Scraping 95% Python 90% SQL 85% ETL Pipelines 80% C++ 72% Azure Cloud 72% 8+ Projects 1 Year Experience 35+ Skills Mastered 11 Certifications Skills & Expertise
  - heading "Skills & Expertise" [level=2]
  - paragraph: 2 skills across 2 domains — 0 Expert, 2 Advanced.
  - button "All (2)" [pressed]
  - button "Ad (1)"
  - button "asbrsa (1)"
  - button "asda, Advanced, 75% proficiency": asda Advanced · 75%
  - button "asrsar, Advanced, 85% proficiency": asrsar Advanced · 85%
  - text: 0 Expert 2 Advanced 0 Intermediate 0 Beginner My Projects
  - heading "My Projects" [level=2]
  - paragraph: Data pipelines, web scrapers, full-stack apps, and mobile experiences.
  - button "All" [pressed]
  - button "Data Engineeringa"
  - button "Data Engineering"
  - link "View details for safsaf":
    - text: Web App Featured
    - heading "safsaf" [level=3]
    - link "Live site":
      - /url: safsaf
    - link "View on GitHub":
      - /url: asfsafsasa
    - paragraph: safsafsafsa
    - text: assafsaf
  - link "View details for fsa":
    - text: Web App Featured
    - heading "fsa" [level=3]
    - link "Live site":
      - /url: asfasfsa
    - link "View on GitHub":
      - /url: asfasafa
    - paragraph: ____adfasf
  - link "View details for ijpji":
    - text: Web App
    - heading "ijpji" [level=3]
    - link "Live site":
      - /url: kl'
    - link "View on GitHub":
      - /url: kl'kl
    - paragraph: _____ijpij
  - link "View details for sfaf":
    - text: Web App
    - heading "sfaf" [level=3]
    - link "Live site":
      - /url: safsafsa
    - link "View on GitHub":
      - /url: sfsa
    - paragraph: ____asfsaf
  - text: Work Experience
  - heading "Work Experience" [level=2]
  - paragraph: Scholarships, certifications, and community contributions that shaped my data engineering career.
  - heading "asbr" [level=3]
  - paragraph: sarbsa
  - paragraph: rbsar
  - text: Internship asbra
  - list:
    - listitem: • abwras
  - text: Certifications
  - heading "Certifications" [level=2]
  - paragraph: 3 verified certifications from IBM, DataCamp, Microsoft, and HackerRank.
  - button "All (3)" [pressed]
  - button "Python (3)"
  - button "Data Engineering (0)"
  - button "AI & Data Science (0)"
  - button "Cloud (0)"
  - button "Database (0)"
  - text: ghlghl 1 cert 🏅
  - heading "glgh" [level=3]
  - text: ghgl Python ghlghl
  - link "View glgh credential":
    - /url: "#"
    - text: View Certificate
  - text: 2 afasbf 1 cert 🏅
  - heading "asfa25" [level=3]
  - text: asf a2 Python 2 afasbf
  - link "View asfa25 credential":
    - /url: "#"
    - text: View Certificate
  - text: 1 cert 🏅aar
  - heading "_" [level=3]
  - text: sar Python
  - link "View _ credential":
    - /url: "#"
    - text: View Certificate
  - text: 🎓 0 DataCamp 🔵 0 IBM 🪟 0 Microsoft 💻 0 HackerRank Get In Touch
  - heading "Get In Touch" [level=2]
  - paragraph: Have a project in mind or want to discuss data engineering? I'd love to hear from you.
  - paragraph: Email
  - link "mustafasayedsaeed@outlook.com":
    - /url: mailto:mustafasayedsaeed@outlook.com
  - paragraph: Phone
  - link "+20 100 000 0000":
    - /url: tel:+201000000000
  - paragraph: Location
  - paragraph: Cairo, Egypt
  - paragraph: GitHub
  - link "github.com/mustafasayed":
    - /url: https://github.com/mustafasayed
  - paragraph: LinkedIn
  - link "linkedin.com/in/mustafasayed":
    - /url: https://linkedin.com/in/mustafasayed
  - iframe
  - text: Your Name
  - textbox "Your Name":
    - /placeholder: Mustafa Sayed
  - text: 0/100 Your Email
  - textbox "Your Email":
    - /placeholder: you@example.com
  - text: Message
  - textbox "Message":
    - /placeholder: Tell me about your project or just say hello...
  - text: 0/2000
  - button "Send Message"
  - button "Sync Debug ▼"
- contentinfo:
  - text: MS Mustafa Sayed Data Engineer · Cairo, Egypt
  - link "GitHub":
    - /url: https://github.com/mustafa-sayed
  - link "LinkedIn":
    - /url: https://www.linkedin.com/in/mustafa-sayed
  - link "Email":
    - /url: mailto:mustafasayed20002@gmail.com
  - paragraph: Made with Cairo
- region "Notifications (F8)":
  - list
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | test.describe("Portfolio sections", () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto("/");
  6   |     await expect(page.locator("section").first()).toBeVisible({ timeout: 15000 });
  7   |   });
  8   | 
  9   |   test("hero section renders with heading content", async ({ page }) => {
  10  |     const hero = page.locator("section").first();
  11  |     await expect(hero).toBeVisible();
  12  |     // Hero should contain heading text
  13  |     const heading = hero.locator("h1, h2, [data-testid='hero-name'], [class*='hero']");
  14  |     await expect(heading.first()).toBeVisible({ timeout: 5000 });
  15  |   });
  16  | 
  17  |   test("about section is present in the page", async ({ page }) => {
  18  |     // Scroll to about section or check it exists
  19  |     const aboutSection = page.locator("section").nth(1);
  20  |     await expect(aboutSection).toBeAttached();
  21  |   });
  22  | 
  23  |   test("navigation links scroll to correct sections", async ({ page }) => {
  24  |     const nav = page.locator("nav");
> 25  |     await expect(nav).toBeVisible();
      |                       ^ Error: expect(locator).toBeVisible() failed
  26  | 
  27  |     // Nav uses buttons for scroll-to-section, not anchor tags
  28  |     const aboutBtn = nav.locator("button").filter({ hasText: /about/i }).first();
  29  |     if (await aboutBtn.isVisible()) {
  30  |       await aboutBtn.click();
  31  |       await page.waitForTimeout(500);
  32  |     }
  33  |   });
  34  | 
  35  |   test("footer renders with content", async ({ page }) => {
  36  |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  37  |     const footer = page.locator("footer");
  38  |     await expect(footer).toBeVisible({ timeout: 5000 });
  39  |     const footerText = await footer.textContent();
  40  |     expect(footerText).toBeTruthy();
  41  |   });
  42  | 
  43  |   test("page has proper meta tags for SEO", async ({ page }) => {
  44  |     const title = await page.title();
  45  |     expect(title).toBeTruthy();
  46  |     expect(title.length).toBeGreaterThan(0);
  47  |   });
  48  | 
  49  |   test("skills section is present in the page", async ({ page }) => {
  50  |     await page.evaluate(() => document.querySelector("#skills")?.scrollIntoView());
  51  |     const skills = page.locator("#skills");
  52  |     await expect(skills).toBeVisible({ timeout: 5000 });
  53  |   });
  54  | 
  55  |   test("projects section is present in the page", async ({ page }) => {
  56  |     await page.evaluate(() => document.querySelector("#projects")?.scrollIntoView());
  57  |     const projects = page.locator("#projects");
  58  |     await expect(projects).toBeVisible({ timeout: 5000 });
  59  |   });
  60  | 
  61  |   test("experience section is present in the page", async ({ page }) => {
  62  |     await page.evaluate(() => document.querySelector("#experience")?.scrollIntoView());
  63  |     const experience = page.locator("#experience");
  64  |     await expect(experience).toBeVisible({ timeout: 5000 });
  65  |   });
  66  | 
  67  |   test("certifications section is present in the page", async ({ page }) => {
  68  |     await page.evaluate(() => document.querySelector("#certifications")?.scrollIntoView());
  69  |     const certs = page.locator("#certifications");
  70  |     await expect(certs).toBeVisible({ timeout: 5000 });
  71  |   });
  72  | 
  73  |   test("contact section is present in the page", async ({ page }) => {
  74  |     await page.evaluate(() => document.querySelector("#contact")?.scrollIntoView());
  75  |     const contact = page.locator("#contact");
  76  |     await expect(contact).toBeVisible({ timeout: 5000 });
  77  |   });
  78  | 
  79  |   test("all sections render without console errors", async ({ page }) => {
  80  |     const errors: string[] = [];
  81  |     page.on("pageerror", (err) => errors.push(err.message));
  82  | 
  83  |     // Navigate and scroll through the full page
  84  |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  85  |     await page.waitForTimeout(1000);
  86  | 
  87  |     // Filter out known benign errors (e.g. third-party analytics)
  88  |     const criticalErrors = errors.filter(
  89  |       (e) => !e.includes("ResizeObserver") && !e.includes("Script error")
  90  |     );
  91  |     expect(criticalErrors).toEqual([]);
  92  |   });
  93  | 
  94  |   test("page has meta description tag", async ({ page }) => {
  95  |     const desc = await page.locator('meta[name="description"]').getAttribute("content");
  96  |     expect(desc).toBeTruthy();
  97  |     expect(desc!.length).toBeGreaterThan(0);
  98  |   });
  99  | });
  100 | 
```