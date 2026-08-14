import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./error-messages";

describe("getErrorMessage", () => {
  it("maps network errors case-insensitively", () => {
    expect(getErrorMessage(new Error("Network error"))).toBe(
      "Connection error — check your internet connection",
    );
    expect(getErrorMessage(new Error("FETCH failed"))).toBe(
      "Connection error — check your internet connection",
    );
  });

  it("maps auth, forbidden, and not-found errors case-insensitively", () => {
    expect(getErrorMessage(new Error("Unauthorized"))).toBe(
      "Session expired — please log in again",
    );
    expect(getErrorMessage(new Error("Forbidden"))).toBe(
      "You do not have permission to access this",
    );
    expect(getErrorMessage(new Error("Not Found 404"))).toBe(
      "This content no longer exists",
    );
  });

  it("returns the original message when nothing matches", () => {
    expect(getErrorMessage(new Error("Something else entirely"))).toBe(
      "Something else entirely",
    );
  });

  it("falls back to a generic message for non-Error values", () => {
    expect(getErrorMessage("oops")).toBe(
      "Something went wrong on our end. Please try again.",
    );
  });
});
