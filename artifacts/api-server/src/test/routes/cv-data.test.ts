import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import { fetchCvData } from "../../utils/cv-data";

it("constrains every PDF content query to one portfolio", async () => {
  const requests: URL[] = [];
  const client = createClient("http://127.0.0.1:54321", "test-key", {
    global: { fetch: async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    } },
    auth: { persistSession: false },
  });
  await fetchCvData(client, "11111111-1111-4111-8111-111111111111");
  expect(requests).toHaveLength(5);
  for (const url of requests) {
    expect(url.searchParams.get("portfolio_id"), url.pathname).toBe("eq.11111111-1111-4111-8111-111111111111");
  }
});
