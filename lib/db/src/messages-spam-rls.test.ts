import { describe, expect, it } from "vitest";
import { anonClient, ensureSchema, isLocalSupabaseUp, serviceClient } from "./rls-test-helpers";

const run = await isLocalSupabaseUp();

describe.runIf(run)("message spam guard under anon RLS (068)", () => {
  it("rejects the sixth recent message without granting anon SELECT", async () => {
    const { portfolioA } = await ensureSchema();
    const email = `${crypto.randomUUID()}@example.org`;
    const anon = anonClient();
    const message = { portfolio_id: portfolioA, name: "Visitor", email, message: "A genuine contact message" };
    try {
      for (let i = 0; i < 5; i++) {
        const { error } = await anon.from("messages").insert(message);
        expect(error).toBeNull();
      }
      const { data, error: readError } = await anon.from("messages").select("id").eq("email", email);
      expect(readError).toBeNull();
      expect(data).toEqual([]);
      const { error } = await anon.from("messages").insert(message);
      expect(error).not.toBeNull();
      expect(error?.message).toContain("Rate limit exceeded");
      const { count } = await serviceClient().from("messages").select("id", { count: "exact", head: true }).eq("email", email);
      expect(count).toBe(5);
    } finally {
      await serviceClient().from("messages").delete().eq("email", email);
    }
  });
});
