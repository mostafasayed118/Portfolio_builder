import { describe, it, expect } from "vitest";
import { en } from "@/i18n/en";
import { ar } from "@/i18n/ar";
import type { TranslationKeys } from "@/i18n";

function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      keys.push(...collectKeys(obj[key] as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

describe("i18n translation objects", () => {
  it("en and ar have matching top-level keys", () => {
    const enKeys = Object.keys(en).sort();
    const arKeys = Object.keys(ar).sort();
    expect(enKeys).toEqual(arKeys);
  });

  it("en and ar have matching nested keys", () => {
    const enLeafKeys = collectKeys(en).sort();
    const arLeafKeys = collectKeys(ar).sort();
    expect(enLeafKeys).toEqual(arLeafKeys);
  });

  it("all translation values are strings", () => {
    function checkStrings(obj: Record<string, unknown>): void {
      for (const value of Object.values(obj)) {
        if (typeof value === "object" && value !== null) {
          checkStrings(value as Record<string, unknown>);
        } else {
          expect(typeof value).toBe("string");
        }
      }
    }
    checkStrings(en);
    checkStrings(ar);
  });

  it("no empty string values in en", () => {
    function checkNoEmpty(obj: Record<string, unknown>): void {
      for (const value of Object.values(obj)) {
        if (typeof value === "object" && value !== null) {
          checkNoEmpty(value as Record<string, unknown>);
        } else {
          expect(value).not.toBe("");
        }
      }
    }
    checkNoEmpty(en);
  });

  it("TranslationKeys type is satisfied by both objects", () => {
    const enTyped: TranslationKeys = en;
    const arTyped: TranslationKeys = ar;
    expect(enTyped).toBeDefined();
    expect(arTyped).toBeDefined();
  });
});
