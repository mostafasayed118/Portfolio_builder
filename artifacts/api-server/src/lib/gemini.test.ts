import { describe, it, expect } from "vitest";
import { parseListResponse } from "./gemini";

describe("parseListResponse", () => {
  it("splits comma-separated values and trims whitespace", () => {
    expect(parseListResponse("frontend, ui ,  responsive", 5)).toEqual([
      "frontend",
      "ui",
      "responsive",
    ]);
  });

  it("splits newline-separated values and strips bullet markers", () => {
    expect(parseListResponse("- python\n- sql\n* react", 5)).toEqual([
      "python",
      "sql",
      "react",
    ]);
  });

  it("strips surrounding quotes", () => {
    expect(parseListResponse('"backend", "database"', 5)).toEqual(["backend", "database"]);
  });

  it("deduplicates and caps at the limit", () => {
    expect(parseListResponse("a, b, a, c, d, e, f", 5)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseListResponse("", 5)).toEqual([]);
    expect(parseListResponse("   ", 5)).toEqual([]);
  });
});
