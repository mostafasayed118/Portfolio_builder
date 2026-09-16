import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logWarn } from "@workspace/logging";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

type AccessTokenGetter = () => Promise<string | null>;
let accessTokenGetter: AccessTokenGetter | null = null;
let tokenGeneration = 0;

export function setSupabaseAccessTokenGetter(getter: AccessTokenGetter | null): void {
  accessTokenGetter = getter;
  tokenGeneration += 1;
  _client = null;
}

function createBrowserSupabase(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    logWarn(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — running in offline mode.",
      "supabase-client",
    );
    return null;
  }
  const getter = accessTokenGetter;
  const generation = tokenGeneration;
  if (!getter) return createClient<Database>(supabaseUrl, supabaseAnonKey);
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => {
      if (generation !== tokenGeneration) throw new Error("Supabase session changed");
      const token = await getter();
      if (generation !== tokenGeneration) throw new Error("Supabase session changed");
      if (!token?.trim()) throw new Error("Supabase authentication is required");
      return token;
    },
  });
}

let _client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> | null {
  if (!_client) {
    _client = createBrowserSupabase();
  }
  return _client;
}

export function resetSupabase() {
  _client = null;
}
