import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import ClerkAuthBridge from "../features/auth/components/ClerkAuthBridge";

const mocks = vi.hoisted(() => ({
  getToken: vi.fn().mockResolvedValue("session-token"),
  supabaseGetter: vi.fn<(getter: (() => Promise<string | null>) | null) => void>(),
  apiGetter: vi.fn(),
  me: vi.fn().mockResolvedValue({ success: false }),
  state: { isLoaded: true, isSignedIn: true, sessionId: "session-a" },
  user: { id: "user_a", primaryEmailAddress: { emailAddress: "owner@test.com" } },
}));
vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ ...mocks.state, getToken: mocks.getToken, signOut: vi.fn() }),
  useUser: () => ({ user: mocks.user }),
}));
vi.mock("@workspace/supabase/client", () => ({ setSupabaseAccessTokenGetter: mocks.supabaseGetter }));
vi.mock("@/lib/auth-token", () => ({
  setAuthTokenGetter: mocks.apiGetter,
  setAuthMissingHandler: vi.fn(),
  setAuthReady: vi.fn(),
  getClerkToken: () => mocks.getToken(),
}));
vi.mock("@/lib/api-client", () => ({ api: { users: { me: mocks.me } } }));
vi.mock("../features/auth/components/diag", () => ({ diag: vi.fn() }));

function latestGetter() {
  const getter = mocks.supabaseGetter.mock.calls.at(-1)?.[0];
  if (!getter) throw new Error("No Supabase token getter registered");
  return getter;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state = { isLoaded: true, isSignedIn: true, sessionId: "session-a" };
  mocks.getToken.mockResolvedValue("session-token");
  mocks.me.mockResolvedValue({ success: false });
});
afterEach(() => vi.restoreAllMocks());

describe("ClerkAuthBridge Supabase JWT lifecycle", () => {
  it("registers a session getter and clears it on unmount", async () => {
    const view = render(<ClerkAuthBridge>child</ClerkAuthBridge>);
    await waitFor(() => expect(mocks.supabaseGetter).toHaveBeenCalledWith(expect.any(Function)));
    await expect(latestGetter()()).resolves.toBe("session-token");
    view.unmount();
    expect(mocks.supabaseGetter).toHaveBeenLastCalledWith(null);
  });

  it("invalidates an in-flight getter when the Clerk session changes", async () => {
    let finish: (token: string) => void = () => {};
    mocks.getToken.mockImplementation(() => new Promise<string>((resolve) => { finish = resolve; }));
    const view = render(<ClerkAuthBridge>child</ClerkAuthBridge>);
    await waitFor(() => expect(mocks.supabaseGetter).toHaveBeenCalledWith(expect.any(Function)));
    const oldGetter = latestGetter();
    const pending = oldGetter();
    mocks.state = { ...mocks.state, sessionId: "session-b" };
    view.rerender(<ClerkAuthBridge>child</ClerkAuthBridge>);
    finish("stale-session-token");
    await expect(pending).resolves.toBeNull();
    expect(latestGetter()).not.toBe(oldGetter);
    await expect(oldGetter()).resolves.toBeNull();
  });

  it("invalidates retained and pending getters on unmount", async () => {
    let finish: (token: string) => void = () => {};
    mocks.getToken.mockImplementation(() => new Promise<string>((resolve) => { finish = resolve; }));
    const view = render(<ClerkAuthBridge>child</ClerkAuthBridge>);
    const getter = latestGetter();
    const pending = getter();
    view.unmount();
    finish("stale-session-token");
    await expect(pending).resolves.toBeNull();
    mocks.getToken.mockResolvedValue("stale-session-token");
    await expect(getter()).resolves.toBeNull();
  });

  it("never supplies a token while signed out", async () => {
    mocks.state = { ...mocks.state, isSignedIn: false };
    render(<ClerkAuthBridge>child</ClerkAuthBridge>);
    await waitFor(() => expect(mocks.supabaseGetter).toHaveBeenCalledWith(expect.any(Function)));
    await expect(latestGetter()()).resolves.toBeNull();
    expect(mocks.getToken).not.toHaveBeenCalled();
  });
});
