import { describe, it, expect, vi } from "vitest";
import { applyViewSpec, viewSpec } from "../../lib/messages/view-spec";

describe("viewSpec", () => {
  it("omitted status and preset → default visible-row view", () => {
    expect(viewSpec()).toEqual({ softDelete: true });
  });

  it("all → default view (falls through the status branches)", () => {
    expect(viewSpec("all")).toEqual({ softDelete: true });
  });

  it("unread → active unread rows", () => {
    expect(viewSpec("unread")).toEqual({ softDelete: true, eq: { status: "unread" } });
  });

  it("read → active read rows", () => {
    expect(viewSpec("read")).toEqual({ softDelete: true, eq: { status: "read" } });
  });

  it("archived → soft-deleted set only", () => {
    expect(viewSpec("archived")).toEqual({ softDelete: "only" });
  });

  it("spam → active rows flagged as spam", () => {
    expect(viewSpec("spam")).toEqual({ softDelete: true, eq: { is_spam: true } });
  });

  it("unread_today → active unread rows created since UTC midnight", () => {
    const spec = viewSpec(undefined, "unread_today");
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    expect(spec).toEqual({
      softDelete: true,
      eq: { status: "unread" },
      gte: { created_at: startOfToday.toISOString() },
    });
  });

  it("needs_reply → read rows never replied to", () => {
    expect(viewSpec(undefined, "needs_reply")).toEqual({
      softDelete: true,
      eq: { status: "read" },
      isNull: ["replied_at"],
    });
  });

  it("unread_or_archived → single disjunction, no soft-delete filter", () => {
    const spec = viewSpec(undefined, "unread_or_archived");
    expect(spec).toEqual({ or: "status.eq.unread,deleted_at.not.is.null" });
    expect(spec.softDelete).toBeUndefined();
  });
});

/** Chain double that records every filter call in order, fluent-style. */
function makeChain() {
  const calls: Array<[string, ...unknown[]]> = [];
  const chain = {
    eq: vi.fn((c: string, v: unknown) => {
      calls.push(["eq", c, v]);
      return chain;
    }),
    gte: vi.fn((c: string, v: string) => {
      calls.push(["gte", c, v]);
      return chain;
    }),
    is: vi.fn((c: string, v: null) => {
      calls.push(["is", c, v]);
      return chain;
    }),
    not: vi.fn((c: string, op: string, v: unknown) => {
      calls.push(["not", c, op, v]);
      return chain;
    }),
    or: vi.fn((f: string) => {
      calls.push(["or", f]);
      return chain;
    }),
  };
  return { chain, calls };
}

describe("applyViewSpec", () => {
  it("softDelete true → deleted_at IS NULL first", () => {
    const { chain, calls } = makeChain();
    applyViewSpec(chain, { softDelete: true, eq: { status: "unread" } });
    expect(calls).toEqual([
      ["is", "deleted_at", null],
      ["eq", "status", "unread"],
    ]);
  });

  it("softDelete 'only' → deleted_at IS NOT NULL via not()", () => {
    const { chain, calls } = makeChain();
    applyViewSpec(chain, { softDelete: "only" });
    expect(calls).toEqual([["not", "deleted_at", "is", null]]);
  });

  it("no softDelete flag → no soft-delete predicate", () => {
    const { chain, calls } = makeChain();
    applyViewSpec(chain, { or: "status.eq.unread,deleted_at.not.is.null" });
    expect(calls).toEqual([["or", "status.eq.unread,deleted_at.not.is.null"]]);
  });

  it("applies predicates in spec order: softDelete, eq, gte, isNull, or", () => {
    const { chain, calls } = makeChain();
    const spec = viewSpec(undefined, "unread_today");
    applyViewSpec(chain, {
      ...spec,
      isNull: ["replied_at"],
      or: "status.eq.unread,deleted_at.not.is.null",
    });
    expect(calls.map((c) => c[0])).toEqual(["is", "eq", "gte", "is", "or"]);
  });

  it("returns the same chain instance for fluent chaining", () => {
    const { chain } = makeChain();
    expect(applyViewSpec(chain, { softDelete: true })).toBe(chain);
  });

  it("list spec and a spec applied to an update chain produce identical predicates", () => {
    const { chain: listChain, calls: listCalls } = makeChain();
    applyViewSpec(listChain, viewSpec("archived"));
    const { chain: updateChain, calls: updateCalls } = makeChain();
    applyViewSpec(updateChain, viewSpec("archived"));
    expect(listCalls).toEqual(updateCalls);
  });
});
