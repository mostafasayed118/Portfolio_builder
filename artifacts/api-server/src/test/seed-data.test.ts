import { describe, expect, it } from "vitest";
import { SEED_BLOG_POSTS } from "../lib/seed-data";

describe("starter blog seed data", () => {
  it("contains one editable article for each requested topic", () => {
    expect(SEED_BLOG_POSTS).toHaveLength(5);
    expect(new Set(SEED_BLOG_POSTS.map((post) => post.slug)).size).toBe(SEED_BLOG_POSTS.length);

    const tags = new Set(SEED_BLOG_POSTS.flatMap((post) => post.tags));
    expect(tags).toBeInstanceOf(Set);
    expect(tags.has("AI")).toBe(true);
    expect(tags.has("Flutter")).toBe(true);
    expect(tags.has("Mobile")).toBe(true);
    expect(tags.has("Web")).toBe(true);
    expect(tags.has("Vibe Code")).toBe(true);
  });

  it("provides complete Markdown content for every starter post", () => {
    for (const post of SEED_BLOG_POSTS) {
      expect(post.title.length).toBeGreaterThan(10);
      expect(post.excerpt.length).toBeGreaterThan(40);
      expect(post.content).toContain("##");
      expect(post.content.length).toBeGreaterThan(500);
    }
  });
});
