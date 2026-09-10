/**
 * Wires the generated `@workspace/api-client-react` client to the admin
 * app's transport concerns. Imported once at startup (see main.tsx) so the
 * generated endpoint functions can resolve the API origin, attach Clerk
 * bearer tokens, inject CSRF tokens on mutations, and signal the auth-missing
 * handler when a session is genuinely dead.
 *
 * The generated client stays free of Clerk/Supabase imports; this module is
 * the single adapter between the two.
 */
import {
  setBaseUrl,
  setAuthTokenGetter,
  setCsrfTokenGetter,
  setAuthMissingHandler,
} from "@workspace/api-client-react";
import { getClerkToken, fireAuthMissingFromApiClient } from "./auth-token";
import { getCsrfToken } from "./csrf";
import { getApiUrl } from "./env";

setBaseUrl(getApiUrl());
setAuthTokenGetter((forceRefresh = false) => getClerkToken(forceRefresh));
setCsrfTokenGetter(getCsrfToken);
setAuthMissingHandler(() => fireAuthMissingFromApiClient());
