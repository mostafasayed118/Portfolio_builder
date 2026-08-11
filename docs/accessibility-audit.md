# Accessibility Audit — Portfolio

> **Date:** 2026-06-04
> **Scope:** Portfolio public site (WCAG 2.1 AA)

## Summary

The portfolio site has strong baseline a11y. Key patterns are in place: landmark elements, ARIA attributes, keyboard navigation, skip-to-content, and focus management. No critical WCAG violations found.

## Checklist

### ✅ Landmark Elements

- `<main id="main-content">` in Home.tsx and ProjectDetail.tsx
- `<footer>` in Footer.tsx
- `<header>` in Navbar.tsx
- Skip-to-content link in Navbar.tsx (`sr-only` + `focus:not-sr-only`)

### ✅ Keyboard Navigation

- All interactive elements are `<button>` or `<a>` (native focusable)
- SkillTag: `role="button"`, `tabIndex={0}`, Enter/Space handlers
- ProjectCard: `role="link"`, `tabIndex={0}`, Enter/Space handlers
- MobileMenu: Escape key closes, focus trap implemented
- Navbar: Escape key closes mobile menu

### ✅ ARIA Attributes

- `aria-label` on theme toggle, language toggle, social links, scroll-down button
- `aria-expanded` on mobile menu button
- `aria-controls` on mobile menu button → `data-mobile-menu`
- `aria-current="page"` on active nav links
- `aria-hidden` on decorative elements (BackgroundOrbs, blur layers, loading spinners)
- `aria-disabled` on disabled CV download button

### ✅ Form Accessibility

- ContactForm: proper `<label>` elements, validation messages, honeypot for bots
- HeroEditor: form labels, placeholders, keyboard shortcuts

### ✅ Focus Management

- `focus-visible` outlines for keyboard users (CSS `*:focus-visible`)
- Skip-to-content visible on focus
- MobileMenu focus trap (Tab cycles within menu)
- Focus returns to hamburger button when mobile menu closes

### ✅ Semantic HTML

- `<section>` with `id` for each portfolio section
- `<main>` wrapping page content
- `<article>` in ProjectDetail
- `<button>` for actions, `<a>` for navigation
- `<h1>`–`<h3>` hierarchy maintained

### ✅ Images

- `alt` text on all `<img>` elements
- `aria-hidden` on decorative images
- `loading="lazy"` on below-fold images (OptimizedImage)
- Iframe has `title` attribute

### ⚠️ Minor Notes

- **SkillTag** uses `role="button"` on a `<div>` — technically valid with `tabIndex={0}` and keyboard handlers, but `<button>` would be more semantic. Low priority.
- **ContactInfoPanel** links use `data-testid` but not `aria-label` — links have visible text content so this is acceptable.

## WCAG 2.1 AA Compliance

| Principle      | Status                                                 |
| -------------- | ------------------------------------------------------ |
| Perceivable    | ✅ Sufficient contrast, alt text, responsive design    |
| Operable       | ✅ Keyboard navigation, skip links, focus management   |
| Understandable | ✅ Consistent navigation, predictable behavior, labels |
| Robust         | ✅ Semantic HTML, ARIA attributes, valid markup        |

**No critical or major WCAG violations identified.**
