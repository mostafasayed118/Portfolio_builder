import { describe, expect, it } from "vitest";
import { formatDate, formatMonthYear } from "./format-date";

describe("formatDate (portfolio)", () => {
  it("returns an empty string for null, undefined, or empty input", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });

  it("formats an ISO date with a long month, day, and year", () => {
    expect(formatDate("2024-01-05T12:00:00Z")).toMatch(/January 5, 2024|Jan 5, 2024/);
  });
});

describe("formatMonthYear", () => {
  it("formats a YYYY-MM aggregation key as 'Month YYYY'", () => {
    expect(formatMonthYear("2026-04")).toBe("April 2026");
  });

  it("passes through keys that are not YYYY-MM dates", () => {
    expect(formatMonthYear("misc")).toBe("misc");
  });

  it("renders a non-empty label for the Arabic locale", () => {
    const label = formatMonthYear("2026-04", "ar");
    expect(label.length).toBeGreaterThan(0);
    expect(label).not.toBe("April 2026");
  });
});
