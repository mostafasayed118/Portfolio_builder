# @workspace/auth

Framework-agnostic auth context for the admin SPA: a typed React context
holding the signed-in user (id, email, role) plus derived `isAdmin` /
`isSuperadmin` flags.

## Public API (src/index.tsx)

- `AuthContextProvider` — provider taking the resolved `AuthContextValue`.
- `useAuthUser()` — context accessor (throws outside a provider).
- Types: `AuthUser`, `AuthContextValue`.

## Position

Consumed by `artifacts/admin`; the concrete provider composition (Clerk
hooks → `AuthContextValue`) lives app-side. `artifacts/portfolio` does not
use this package (its admin check is handled by the API server).

## Usage

```tsx
import { AuthContextProvider, useAuthUser } from "@workspace/auth";

<AuthContextProvider value={value}>
  <App />
</AuthContextProvider>;
```
