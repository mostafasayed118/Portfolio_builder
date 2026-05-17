import { createContext, useContext, createElement, type ReactNode } from "react";

export type AuthUser = {
  id: string;
  email: string;
  role: "admin" | "visitor";
};

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthContextProvider({ value, children }: { value: AuthContextValue; children: ReactNode }) {
  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuthUser(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthUser must be used within an AuthProvider");
  return ctx;
}
