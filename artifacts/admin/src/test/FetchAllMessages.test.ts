import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api-client";
import {
  fetchAllMessages,
  MAX_MESSAGE_PAGES,
  MESSAGE_BATCH_SIZE,
} from "@/lib/use-entity-query";
import type { Message } from "@workspace/supabase/types";

vi.mock("@/lib/logger", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import { logWarn } from "@/lib/logger";

function fakeRow(i: number): Message {
  return { id: `m-${i}` } as unknown as Message;
}

type ListEnvelope = Awaited<ReturnType<typeof api.messages.list>>;

/** A full page of rows whose ids encode their absolute offset ("m-<offset+i>"). */
function pageAt(offset: number, rowCount: number, total?: number): ListEnvelope {
  const data = {
    data: Array.from({ length: rowCount }, (_, i) => fakeRow(offset + i)),
    ...(total !== undefined
      ? {
          pagination: {
            total,
            limit: MESSAGE_BATCH_SIZE,
            offset,
            hasMore: offset + rowCount < total,
          },
        }
      : {}),
  };
  return { success: true, data } as ListEnvelope;
}

function expectContiguousIds(rows: Message[], expectedCount: number): void {
  const ids = rows.map((r) => r.id);
  expect(ids).toEqual(Array.from({ length: expectedCount }, (_, i) => `m-${i}`));
}

describe("fetchAllMessages — pagination walk", () => {
  let listSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    listSpy = vi.spyOn(api.messages, "list").mockReset();
    vi.mocked(logWarn).mockClear();
  });

  it("returns a single short first page without further requests", async () => {
    listSpy.mockResolvedValue(pageAt(0, 10));

    const rows = await fetchAllMessages(undefined, undefined, undefined);
    expect(listSpy).toHaveBeenCalledTimes(1);
    expectContiguousIds(rows, 10);
    expect(logWarn).not.toHaveBeenCalled();
  });

  it("fetches the parallel remainder after the first page and preserves offset order", async () => {
    const total = MESSAGE_BATCH_SIZE * 2 + 5;
    listSpy.mockImplementation(
      async (_userId, _status, _limit, offset) => {
        if (offset === 0) return pageAt(0, MESSAGE_BATCH_SIZE, total);
        if (offset === MESSAGE_BATCH_SIZE) return pageAt(offset, MESSAGE_BATCH_SIZE, total);
        return pageAt(offset, 5, total);
      },
    );

    const rows = await fetchAllMessages(undefined, undefined, undefined);

    expect(listSpy).toHaveBeenCalledTimes(3);
    expectContiguousIds(rows, total);
    expect(logWarn).not.toHaveBeenCalled();
  });

  it("fetches the remaining pages concurrently after page one", async () => {
    const total = MESSAGE_BATCH_SIZE * 3;
    let inFlight = 0;
    let maxInFlight = 0;
    listSpy.mockImplementation(async (_userId, _status, _limit, offset) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return pageAt(offset, MESSAGE_BATCH_SIZE, total);
    });

    const rows = await fetchAllMessages(undefined, undefined, undefined);

    expect(rows).toHaveLength(total);
    expect(maxInFlight).toBeGreaterThan(1);
  });

  it("never issues more than MAX_MESSAGE_PAGES requests and keeps the rows usable", async () => {
    const total = MESSAGE_BATCH_SIZE * 25;
    listSpy.mockImplementation(
      async (_userId, _status, _limit, offset) => pageAt(offset, MESSAGE_BATCH_SIZE, total),
    );

    const rows = await fetchAllMessages(undefined, undefined, undefined);

    expect(listSpy).toHaveBeenCalledTimes(MAX_MESSAGE_PAGES);
    expect(listSpy.mock.calls.length).toBeLessThanOrEqual(MAX_MESSAGE_PAGES);
    expect(rows).toHaveLength(MAX_MESSAGE_PAGES * MESSAGE_BATCH_SIZE);
    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(logWarn).mock.calls[0]?.[0])).toMatch(/cap/i);
  });

  it("stays capped when the response carries no pagination total", async () => {
    listSpy.mockImplementation(async (_userId, _status, _limit, offset) =>
      pageAt(offset, MESSAGE_BATCH_SIZE),
    );

    const rows = await fetchAllMessages(undefined, undefined, undefined);

    expect(listSpy).toHaveBeenCalledTimes(MAX_MESSAGE_PAGES);
    expectContiguousIds(rows, MAX_MESSAGE_PAGES * MESSAGE_BATCH_SIZE);
    expect(logWarn).toHaveBeenCalledTimes(1);
  });

  it("does not warn when the filtered set exactly fills the capped page count", async () => {
    const total = MAX_MESSAGE_PAGES * MESSAGE_BATCH_SIZE;
    listSpy.mockImplementation(
      async (_userId, _status, _limit, offset) => pageAt(offset, MESSAGE_BATCH_SIZE, total),
    );

    const rows = await fetchAllMessages(undefined, undefined, undefined);

    expect(listSpy).toHaveBeenCalledTimes(MAX_MESSAGE_PAGES);
    expect(rows).toHaveLength(total);
    expect(logWarn).not.toHaveBeenCalled();
  });

  it("throws the server message when a parallel remainder page fails", async () => {
    const total = MESSAGE_BATCH_SIZE * 2;
    listSpy.mockImplementation(async (_userId, _status, _limit, offset) => {
      if (offset === 0) return pageAt(0, MESSAGE_BATCH_SIZE, total);
      if (offset === MESSAGE_BATCH_SIZE) {
        return { success: false, message: "too many requests" } as ListEnvelope;
      }
      return pageAt(offset, MESSAGE_BATCH_SIZE, total);
    });

    await expect(fetchAllMessages(undefined, undefined, undefined)).rejects.toThrow(
      "too many requests",
    );
  });
});
