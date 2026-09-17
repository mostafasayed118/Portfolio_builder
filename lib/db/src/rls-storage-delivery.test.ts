import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { anonClient, clientFor, ensureSchema, serviceClient } from "./rls-test-helpers";

const owner = () => clientFor({ sub: "user_test_ownerA" });

describe("storage publication delivery", () => {
  it("metadata-only renames do not move stored bytes (067 migration blocker)", async () => {
    const path = `legacy-${randomUUID()}.png`;
    const moved = `renamed/${path}`;
    const bucket = serviceClient().storage.from("project_images");
    const rename = (from: string, to: string) => execFileSync("docker", [
      "exec", "supabase_db_Portfolio-Fixer", "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-c",
      `UPDATE storage.objects SET name = '${to}' WHERE bucket_id = 'project_images' AND name = '${from}'`,
    ]);
    try {
      expect((await bucket.upload(path, Buffer.from("legacy-bytes"), { contentType: "image/png" })).error).toBeNull();
      expect(await (await bucket.download(path)).data?.text()).toBe("legacy-bytes");
      rename(path, moved);
      const result = await bucket.download(moved);
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    } finally {
      rename(moved, path);
      await bucket.remove([path]);
    }
  });
  it.each(["project_images", "avatars", "projects", "certifications"])("%s permits owner draft previews but rejects public object delivery", async (bucketId) => {
    const { portfolioB } = await ensureSchema();
    const path = `${portfolioB}/${randomUUID()}.png`;
    const bucket = owner().storage.from(bucketId);
    try {
      const uploaded = await bucket.upload(path, Buffer.from("fixture-image"), { contentType: "image/png" });
      expect(uploaded.error).toBeNull();
      const preview = await bucket.download(path);
      expect(preview.error).toBeNull();
      expect(await preview.data?.text()).toBe("fixture-image");
      expect((await anonClient().storage.from(bucketId).download(path)).data).toBeNull();
      expect((await clientFor({ sub: "user_test_ownerB" }).storage.from(bucketId).download(path)).data).toBeNull();
      const { data } = bucket.getPublicUrl(path);
      const response = await fetch(data.publicUrl);
      expect(response.ok).toBe(false);
    } finally {
      await serviceClient().storage.from(bucketId).remove([path]);
    }
  });

  it("CV rejects malformed, flat, and lookalike prefixes without UUID cast errors", async () => {
    const { portfolioA } = await ensureSchema();
    const paths = ["not-a-uuid/cv-1.pdf", "cv-1.pdf", `${portfolioA}-suffix/cv-1.pdf`, portfolioA];
    const bucket = serviceClient().storage.from("cv");
    try {
      for (const path of paths) {
        expect((await bucket.upload(path, Buffer.from("%PDF-malformed"), { contentType: "application/pdf" })).error).toBeNull();
        const result = await anonClient().storage.from("cv").download(path);
        expect(result.data).toBeNull();
        expect(result.error).not.toBeNull();
        expect(result.error?.message).not.toMatch(/uuid|syntax|22P02/i);
      }
    } finally {
      await bucket.remove(paths);
    }
  });

  it("CV owner can upload/read drafts; anon reads only published prefixes; foreign writes fail", async () => {
    const { portfolioA, portfolioB } = await ensureSchema();
    const paths = [portfolioA, portfolioB].map((id) => `${id}/cv-${Date.now()}.pdf`);
    const bucket = owner().storage.from("cv");
    try {
      for (const path of paths) {
        const uploaded = await bucket.upload(path, Buffer.from("%PDF-fixture"), { contentType: "application/pdf" });
        expect(uploaded.error).toBeNull();
        const preview = await bucket.download(path);
        expect(preview.error).toBeNull();
        expect(await preview.data?.text()).toBe("%PDF-fixture");
      }
      const published = await anonClient().storage.from("cv").download(paths[0]);
      expect(published.error).toBeNull();
      expect(await published.data?.text()).toBe("%PDF-fixture");
      const draft = await anonClient().storage.from("cv").download(paths[1]);
      expect.soft(draft.error).not.toBeNull();
      expect.soft(draft.data).toBeNull();
      const foreign = clientFor({ sub: "user_test_ownerB" }).storage.from("cv");
      const overwritten = await foreign.update(paths[1], Buffer.from("foreign"), { contentType: "application/pdf" });
      expect(overwritten.error).not.toBeNull();
      const inserted = await foreign.upload(`${portfolioB}/cv-foreign.pdf`, Buffer.from("foreign"), { contentType: "application/pdf" });
      expect(inserted.error).not.toBeNull();
      const deleted = await foreign.remove([paths[1]]);
      expect(deleted.data ?? []).toEqual([]);
      expect(await (await bucket.download(paths[1])).data?.text()).toBe("%PDF-fixture");
      expect((await owner().from("portfolios").update({ is_published: false }).eq("id", portfolioA)).error).toBeNull();
      expect((await anonClient().storage.from("cv").download(paths[0])).data).toBeNull();
      expect((await bucket.download(paths[0])).error).toBeNull();
    } finally {
      await serviceClient().storage.from("cv").remove([...paths, `${portfolioB}/cv-foreign.pdf`]);
    }
  });
});
