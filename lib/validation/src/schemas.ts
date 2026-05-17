// ============================================================================
// Layer 3 — Pre-built validation schemas for every form in the project
// ============================================================================

import { rules } from "./rules";

export const contactFormSchema = {
  name:    [rules.required("Name"),    rules.minLength(1, "Name"),    rules.maxLength(100, "Name")],
  email:   [rules.required("Email"),   rules.email("Email")],
  message: [rules.required("Message"), rules.minLength(10, "Message"), rules.maxLength(2000, "Message")],
};

export const skillSchema = {
  name:        [rules.required("Name"),        rules.maxLength(100, "Name")],
  category:    [rules.required("Category")],
  proficiency: [rules.required("Proficiency"), rules.range(1, 100, "Proficiency")],
  sort_order:  [rules.range(0, 9999, "Sort order")],
};

export const projectSchema = {
  title:       [rules.required("Title"),       rules.maxLength(150, "Title")],
  description: [rules.required("Description"), rules.minLength(10, "Description"), rules.maxLength(2000, "Description")],
  github_url:  [rules.url("GitHub URL")],
  live_url:    [rules.url("Live URL", true)],
};

export const experienceSchema = {
  title:   [rules.required("Title"),   rules.maxLength(150, "Title")],
  company: [rules.required("Company"), rules.maxLength(150, "Company")],
  period:  [rules.required("Period")],
};

export const certificationSchema = {
  title:          [rules.required("Title"), rules.maxLength(200, "Title")],
  issuer:         [rules.required("Issuer")],
  credential_url: [rules.url("Credential URL", true)],
};

export const heroSchema = {
  heading: [rules.required("Heading"), rules.maxLength(200, "Heading")],
  name:    [rules.required("Name"),    rules.maxLength(100, "Name")],
};

export const cvUploadSchema = {
  file: [
    rules.required("CV file"),
    rules.fileType(["pdf"], "CV"),
    rules.fileSize(5, "CV"),
  ],
};

export const contactInfoSchema = {
  email:    [rules.email("Contact email")],
  linkedin: [rules.url("LinkedIn URL", true)],
  github:   [rules.url("GitHub URL")],
};

export const siteSettingsSchema = {
  site_name:    [rules.required("Site name"),    rules.maxLength(100, "Site name")],
  site_tagline: [rules.maxLength(200, "Tagline")],
};

export const seoSchema = {
  title:       [rules.required("SEO title"),       rules.maxLength(100, "SEO title")],
  description: [rules.required("SEO description"), rules.maxLength(300, "SEO description")],
};
