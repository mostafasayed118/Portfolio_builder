import { describe, it, expect } from "vitest";
import fs from "node:fs";
import {
  adminListImagesQuerySchema,
  imageEntityTypeSchema,
  IMAGE_ENTITY_TYPES,
} from "./images";

describe("imageEntityTypeSchema", () => {
  it("accepts every exported entity type", () => {
    for (const entityType of IMAGE_ENTITY_TYPES) {
      expect(imageEntityTypeSchema.safeParse(entityType).success).toBe(true);
    }
  });

  it("rejects a value outside the allowlist with the exact enum message", () => {
    const result = imageEntityTypeSchema.safeParse("invalid-type");
    expect(result.success).toBe(false);
    if (result.success) return;
    const expected = `Invalid enum value. Expected ${IMAGE_ENTITY_TYPES.map((t) => `'${t}'`).join(" | ")}, received 'invalid-type'`;
    expect(result.error.issues[0]?.message).toBe(expected);
  });
});

describe("adminListImagesQuerySchema", () => {
  it("accepts a valid entity type and uuid entity_id", () => {
    expect(
      adminListImagesQuerySchema.safeParse({
        entity_type: "projects",
        entity_id: "00000000-0000-0000-0000-000000000001",
      }).success,
    ).toBe(true);
  });

  it("rejects an entity type outside the allowlist", () => {
    expect(
      adminListImagesQuerySchema.safeParse({
        entity_type: "invalid-type",
        entity_id: "00000000-0000-0000-0000-000000000001",
      }).success,
    ).toBe(false);
  });

  it("rejects a missing or non-uuid entity_id", () => {
    expect(
      adminListImagesQuerySchema.safeParse({ entity_type: "projects" }).success,
    ).toBe(false);
    expect(
      adminListImagesQuerySchema.safeParse({
        entity_type: "projects",
        entity_id: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("uses the shared imageEntityTypeSchema (no local duplicate allowlist)", () => {
    expect(adminListImagesQuerySchema.shape.entity_type).toBe(imageEntityTypeSchema);
  });

  it("upload route consumes the shared const (no local ALLOWED_ENTITY_TYPES)", () => {
    const url = new URL("../../../artifacts/api-server/src/routes/images.ts", import.meta.url);
    const src = fs.readFileSync(url, "utf8");
    expect(src).not.toMatch(/const ALLOWED_ENTITY_TYPES/);
    expect(src).toMatch(/import\s*\{[^}]*IMAGE_ENTITY_TYPES[^}]*\}\s*from\s*"@workspace\/api-zod"/);
  });
});
