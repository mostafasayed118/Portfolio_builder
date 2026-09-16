import { describe, it, expect } from "vitest";
import { queryOrThrow } from "./query";

describe("queryOrThrow error enrichment", () => {
  it("preserves the message of a plain PostgrestError object (not just Error instances)", async () => {
    const failingQuery = Promise.resolve({
      data: null,
      // supabase-js returns PostgrestError as a plain object, not an Error
      error: { message: "Rate limit exceeded: too many messages", code: "P0001" },
    });

    await expect(queryOrThrow(failingQuery, { table: "messages", operation: "createMessage" })).rejects.toThrow(
      "[messages.createMessage] Rate limit exceeded: too many messages",
    );
  });

  it("attaches the Postgrest error code to the wrapped error", async () => {
    const failingQuery = Promise.resolve({
      data: null,
      error: { message: "boom", code: "23505" },
    });

    const err = await queryOrThrow(failingQuery, { table: "t", operation: "op" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as { code?: string }).code).toBe("23505");
  });

  it("wraps an Error instance message with the context prefix once", async () => {
    const failingQuery = Promise.resolve({ data: null, error: new Error("db down") });

    await expect(queryOrThrow(failingQuery, { table: "t", operation: "op" })).rejects.toThrow("[t.op] db down");
  });

  it("keeps an already-prefixed message unchanged (no double prefix)", async () => {
    const failingQuery = Promise.resolve({ data: null, error: new Error("[t.op] db down") });

    await expect(queryOrThrow(failingQuery, { table: "t", operation: "op" })).rejects.toThrow("[t.op] db down");
  });
});
