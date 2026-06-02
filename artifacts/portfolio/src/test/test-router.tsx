import { type ReactNode } from "react";
import { Router as WouterRouter } from "wouter";

export function TestRouter({ children, base = "" }: { children: ReactNode; base?: string }) {
  return <WouterRouter base={base}>{children}</WouterRouter>;
}
