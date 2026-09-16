# @workspace/ui

Shared shadcn-style component library: Radix-based primitives, the
`useToast`/`useFormValidation`/`useIsMobile` hooks, `ApiHealthCheck`, and the
`cn()` class-merge utility. `sideEffects: false` — tree-shakeable.

## Public API (exports)

- `.` — primitive barrel (`Button`, `Card`, `Dialog`, `Toaster`, ...).
- `./hooks` — `useToast` + `toast`, `useFormValidation`, `useIsMobile`.
- `./utils` — `cn()` and friends.

## Position

Consumed by both SPAs (`artifacts/admin`, `artifacts/portfolio`). Depends on
`@workspace/validation` for the form-validation hook. Unused primitive
barrels were pruned; component files stay in `src/components/primitives/`.

## Usage

```tsx
import { Button } from "@workspace/ui";
import { useToast } from "@workspace/ui/hooks";
```
