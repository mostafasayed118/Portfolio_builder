import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { anonClient, clientFor, isLocalSupabaseUp, serviceClient } from "./rls-test-helpers";

const d = (await isLocalSupabaseUp()) ? describe : describe.skip;
const userIds: string[] = [];

async function fixtureUser() {
  const id = randomUUID();
  const sub = `user_preset_${id}`;
  const result = await serviceClient().from("users").insert({ id, clerk_id: sub, email: `${id}@test.local`, role: "user" });
  expect(result.error).toBeNull();
  userIds.push(id);
  return { id, sub, client: clientFor({ sub }) };
}

function preset(user_id: string | null, name = randomUUID()) {
  return { id: randomUUID(), user_id, name, palette: { primary: "204 92% 42%" } };
}

d("rls: user-scoped theme presets (069)", () => {
  afterEach(async () => {
    const result = await serviceClient().from("users").delete().in("id", userIds.splice(0));
    expect(result.error).toBeNull();
  });

  it("regular owners without users-table visibility can create, read, update and delete presets", async () => {
    const { id: userId, client } = await fixtureUser();
    const userRead = await client.from("users").select("id").eq("id", userId);
    expect(userRead.error).toBeNull();
    expect(userRead.data).toEqual([]);
    const row = preset(userId);
    const inserted = await client.from("theme_presets").insert(row).select("id");
    expect(inserted.error).toBeNull();
    expect(inserted.data).toEqual([{ id: row.id }]);
    const read = await client.from("theme_presets").select("id,user_id,palette").eq("id", row.id);
    expect(read.error).toBeNull();
    expect(read.data).toEqual([{ id: row.id, user_id: userId, palette: row.palette }]);
    const updated = await client.from("theme_presets").update({ name: "Renamed" }).eq("id", row.id).select("name");
    expect(updated.error).toBeNull();
    expect(updated.data).toEqual([{ name: "Renamed" }]);
    const deleted = await client.from("theme_presets").delete().eq("id", row.id).select("id");
    expect(deleted.error).toBeNull();
    expect(deleted.data).toEqual([{ id: row.id }]);
    const fresh = await serviceClient().from("theme_presets").select("id").eq("id", row.id);
    expect(fresh.error).toBeNull();
    expect(fresh.data).toEqual([]);
  });

  for (const actor of ["anon", "foreign owner", "foreign superadmin", "UUID sub", "empty sub"]) {
    it(`${actor} cannot read, create, update or delete another user's presets`, async () => {
      const owner = await fixtureUser();
      const other = await fixtureUser();
      if (actor === "foreign superadmin") {
        const promoted = await serviceClient().from("users").update({ role: "superadmin" }).eq("id", other.id);
        expect(promoted.error).toBeNull();
      }
      const client = actor === "anon" ? anonClient()
        : actor === "UUID sub" ? clientFor({ sub: owner.id })
          : actor === "empty sub" ? clientFor({ sub: "" })
            : clientFor({ sub: other.sub, email: `${other.id}@test.local` });
      const row = preset(owner.id);
      const seeded = await serviceClient().from("theme_presets").insert(row);
      expect(seeded.error).toBeNull();
      const read = await client.from("theme_presets").select("id").eq("id", row.id);
      expect(read.error).toBeNull();
      expect(read.data).toEqual([]);
      const inserted = await client.from("theme_presets").insert(preset(owner.id));
      expect(inserted.error?.code).toBe("42501");
      const updated = await client.from("theme_presets").update({ name: "Hijacked" }).eq("id", row.id).select("id");
      expect(updated.error).toBeNull();
      expect(updated.data).toEqual([]);
      const deleted = await client.from("theme_presets").delete().eq("id", row.id).select("id");
      expect(deleted.error).toBeNull();
      expect(deleted.data).toEqual([]);
      const fresh = await serviceClient().from("theme_presets").select("id,name").eq("id", row.id);
      expect(fresh.error).toBeNull();
      expect(fresh.data).toEqual([{ id: row.id, name: row.name }]);
    });
  }

  it("owners cannot assign presets to another user or NULL", async () => {
    const owner = await fixtureUser();
    const other = await fixtureUser();
    const row = preset(owner.id);
    const seeded = await serviceClient().from("theme_presets").insert(row);
    expect(seeded.error).toBeNull();
    for (const user_id of [other.id, null]) {
      const inserted = await owner.client.from("theme_presets").insert(preset(user_id));
      expect(inserted.error?.code).toBe("42501");
      const moved = await owner.client.from("theme_presets").update({ user_id }).eq("id", row.id);
      expect(moved.error?.code).toBe("42501");
    }
    const fresh = await serviceClient().from("theme_presets").select("user_id").eq("id", row.id).single();
    expect(fresh.error).toBeNull();
    expect(fresh.data?.user_id).toBe(owner.id);
  });

  it("enforces ten active presets per user despite users RLS, without blocking edits or other users", async () => {
    const owner = await fixtureUser();
    const other = await fixtureUser();
    const rows = Array.from({ length: 10 }, () => preset(owner.id));
    const seeded = await serviceClient().from("theme_presets").insert(rows);
    expect(seeded.error).toBeNull();
    const eleventh = await owner.client.from("theme_presets").insert(preset(owner.id));
    expect(eleventh.error?.code).toBe("23514");
    const updated = await owner.client.from("theme_presets").update({ description: "Edited at cap" }).eq("id", rows[0]?.id).select("description");
    expect(updated.error).toBeNull();
    expect(updated.data).toEqual([{ description: "Edited at cap" }]);
    const separate = await other.client.from("theme_presets").insert(preset(other.id));
    expect(separate.error).toBeNull();
    const removed = await owner.client.from("theme_presets").delete().eq("id", rows[0]?.id).select("id");
    expect(removed.error).toBeNull();
    expect(removed.data).toHaveLength(1);
    const replacement = await owner.client.from("theme_presets").insert(preset(owner.id));
    expect(replacement.error).toBeNull();
    const fresh = await serviceClient().from("theme_presets").select("id").eq("user_id", owner.id).is("deleted_at", null);
    expect(fresh.error).toBeNull();
    expect(fresh.data).toHaveLength(10);
  });

  it("soft-deleted inserts do not consume capacity, but restoring at cap is denied", async () => {
    const owner = await fixtureUser();
    const archived = { ...preset(owner.id), deleted_at: new Date().toISOString() };
    const seeded = await serviceClient().from("theme_presets").insert(Array.from({ length: 10 }, () => preset(owner.id)));
    expect(seeded.error).toBeNull();
    const inserted = await serviceClient().from("theme_presets").insert(archived);
    expect(inserted.error).toBeNull();
    const restored = await owner.client.from("theme_presets").update({ deleted_at: null }).eq("id", archived.id);
    expect(restored.error?.code).toBe("23514");
    const fresh = await serviceClient().from("theme_presets").select("deleted_at").eq("id", archived.id).single();
    expect(fresh.error).toBeNull();
    expect(fresh.data?.deleted_at).not.toBeNull();
  });

  it("service-role updates cannot restore or transfer an eleventh active preset", async () => {
    const owner = await fixtureUser();
    const other = await fixtureUser();
    const svc = serviceClient();
    const archived = { ...preset(owner.id), deleted_at: new Date().toISOString() };
    const foreign = preset(other.id);
    const seeded = await svc.from("theme_presets").insert([archived, foreign, ...Array.from({ length: 10 }, () => preset(owner.id))]);
    expect(seeded.error).toBeNull();
    const restored = await svc.from("theme_presets").update({ deleted_at: null }).eq("id", archived.id);
    expect.soft(restored.error?.code).toBe("23514");
    const transferred = await svc.from("theme_presets").update({ user_id: owner.id }).eq("id", foreign.id);
    expect.soft(transferred.error?.code).toBe("23514");
    const fresh = await svc.from("theme_presets").select("id").eq("user_id", owner.id).is("deleted_at", null);
    expect(fresh.error).toBeNull();
    expect(fresh.data).toHaveLength(10);
  });

  it("concurrent inserts cannot exceed the per-user cap", async () => {
    const owner = await fixtureUser();
    const seeded = await serviceClient().from("theme_presets").insert(Array.from({ length: 9 }, () => preset(owner.id)));
    expect(seeded.error).toBeNull();
    const results = await Promise.all(Array.from({ length: 4 }, () => owner.client.from("theme_presets").insert(preset(owner.id))));
    expect(results.filter(({ error }) => error === null)).toHaveLength(1);
    expect(results.filter(({ error }) => error?.code === "23514")).toHaveLength(3);
    const fresh = await serviceClient().from("theme_presets").select("id").eq("user_id", owner.id).is("deleted_at", null);
    expect(fresh.error).toBeNull();
    expect(fresh.data).toHaveLength(10);
  });
});
