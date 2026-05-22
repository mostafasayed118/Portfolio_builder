<!-- Sync Impact Report
Version change: 2.0.0 → 3.0.0 (MAJOR: severity level redefinition + new principles + constraints section)
Modified principles:
  - III. Severity Classification → redefined labels: [CRITICAL]/[HIGH]/[MEDIUM]/[LOW] (was [CRITICAL]/[DEGRADED]/[WARNING]/[INFO])
  - VI. Actionable Plan Output → updated severity references to new labels
Added principles:
  - VII. Delta-First — baseline-driven audit, never re-describe known issues
  - VIII. Monorepo Awareness — tag every finding with scope
Added sections:
  - Brownfield Constraints (non-negotiable scope/stack/change constraints)
Removed sections: None
Templates requiring updates:
  - ✅ plan-template.md — Constitution Check section severity labels aligned (done in this pass)
  - ✅ tasks-template.md — task format severity labels aligned (done in this pass)
  - ⚠ spec-template.md — no constitution-specific references, no change needed
  - ⚠ commands/*.md — directory empty, no files to update
Follow-up TODOs: None
-->

# Portfolio-Fixer Constitution — Brownfield Audit Mode

## Core Principles

### I. Truth Over Assumption (NON-NEGOTIABLE)

Never assume something works — verify it against actual code, logs, or tests.
Claims like "should work" or "appears functional" are invalid. Every assertion
MUST be backed by: a test that passes, a log line that confirms behavior, a
config value that enables the feature, or a code path that demonstrably executes.
If verification is not possible within the audit scope, the finding MUST be
tagged as `[UNVERIFIED]` with the specific blocker stated.

**Rationale:** Brownfield projects accumulate silent failures. Assumptions are
the enemy of reliable audits.

### II. Root Cause First

Do not describe symptoms. For every broken component, identify the root cause:
wrong config, missing dependency, bad interface contract, race condition, data
issue, schema drift, or architectural flaw. If the root cause cannot be
determined from available evidence, state what investigation is needed and tag
as `[NEEDS-INVESTIGATION]` with the diagnostic path required.

**Rationale:** Symptom-level reports produce patchwork fixes. Root cause
analysis produces durable solutions.

### III. Severity Classification (MANDATORY)

Every finding MUST be tagged with exactly one severity level:

- **[CRITICAL]** — Data loss risk, security vulnerability, production outage,
  or complete feature failure. Blocks deployment.
- **[HIGH]** — Feature works but incorrectly, slowly, or unreliably. Functional
  but suboptimal. User-visible quality loss. Requires mitigation plan before
  release.
- **[MEDIUM]** — Technical debt, missing edge case handling, or potential future
  failure under load/growth. No current user impact. Tracked in backlog.
- **[LOW]** — Best practice violation, style inconsistency, or optimization
  opportunity. Cosmetic or educational. Optional fixes.

No finding may be reported without a severity tag. Severity MUST be justified
in one sentence explaining impact scope.

**Rationale:** Prioritized findings enable triage. Without severity, everything
looks equally urgent or equally ignorable.

### IV. Evidence-Based Reporting

Every claim about what works or doesn't work MUST cite specific evidence:

- **File path** with line number (e.g., `artifacts/admin/src/App.tsx:42`)
- **Function or method name** under test
- **Test name** if referencing test coverage
- **Log line** or error output if referencing runtime behavior
- **Config value** if referencing configuration
- **Schema definition** if referencing data contracts

Format: `[file:line] — claim — evidence`. No unsourced assertions permitted.

**Rationale:** Evidence enables reproducibility. A developer must be able to
verify every finding independently.

### V. Data Engineering Context

Pay special attention to:

- **Data pipelines**: ETL flows, sync mechanisms, polling intervals, real-time
  channels
- **Transformation logic**: Type coercion, null handling, default values,
  boundary conditions
- **Schema contracts**: Database migrations, Zod schemas, TypeScript types,
  OpenAPI spec alignment
- **Idempotency**: Can operations be safely retried? Are there duplicate-key
  risks? Upsert vs insert semantics?
- **Failure recovery**: What happens when Supabase is down? When Clerk is
  unreachable? When network fails mid-operation?
- **Data consistency**: Are there race conditions between admin writes and
  portfolio reads? Cache invalidation correctness.

Every data-related finding MUST state: what data is affected, how many records
are at risk, and what the blast radius is.

**Rationale:** Portfolio-Fixer is a data-driven CMS. Data integrity failures
are the highest-impact class of bugs.

### VI. Actionable Plan Output

The final audit output MUST produce tasks that a developer can pick up
independently. Each task requires:

1. **Title**: Imperative verb phrase (e.g., "Fix race condition in hero content
   update")
2. **Severity tag**: From Principle III ([CRITICAL] / [HIGH] / [MEDIUM] / [LOW])
3. **Root cause**: From Principle II
4. **Evidence**: From Principle IV (file:line citations)
5. **Acceptance criteria**: Specific, testable conditions that define "done"
6. **Estimated effort**: S / M / L (small = <1hr, medium = 1-4hrs, large = >4hrs)
7. **Dependencies**: What must be completed first, or `none`

Tasks MUST be ordered by severity (CRITICAL first), then by dependency chain.

**Rationale:** Audit reports that cannot be acted on are waste. Every finding
must translate directly to a developer picking up a ticket.

### VII. Delta-First (NON-NEGOTIABLE)

Baseline is `TECHNICAL_DEBT_REPORT.md` (generated 2026-05-18, baseline score
6.8/10). Never re-describe known issues — only verify status as one of:
**FIXED**, **PARTIAL**, or **STILL OPEN**. New findings (not in the baseline)
MUST be tagged as `[NEW]` with evidence of when they were introduced or why
they were missed in the original audit.

**Rationale:** Re-describing known issues wastes time and creates confusion
about what has actually changed. Delta-driven audits focus effort on
what matters: what's fixed, what's still broken, and what's new.

### VIII. Monorepo Awareness

Every finding MUST be tagged with its scope location:

- `[portfolio]` — `artifacts/portfolio/` (public-facing site)
- `[admin]` — `artifacts/admin/` (admin dashboard)
- `[api-server]` — `artifacts/api-server/` (Express backend)
- `[lib/X]` — `lib/` packages (shared libraries)
- `[supabase/migrations]` — database schema changes

Cross-scope findings (e.g., API contract mismatches between admin and
api-server) MUST be tagged with all affected scopes.

**Rationale:** Monorepos have distinct deployment targets, risk profiles, and
ownership boundaries. Scope tags enable targeted triage and prevent
unintended blast radius.

## Brownfield Constraints (NON-NEGOTIABLE)

The following constraints govern all audit activities and MUST NOT be violated:

### Scope Freeze

Stabilization + security ONLY. No architecture rewrites, no feature additions,
no "while we're here" improvements. If a finding suggests an architectural
change, document it as `[INFO]` with a recommendation — do not implement it.

### Stack Freeze

React 19, Vite 7, Express 5, Clerk, Supabase, pnpm. No new libraries without
explicit user approval. Dependency updates for security patches are permitted;
dependency additions for convenience are not.

### API Contract Stability

NO BREAKING CHANGES to existing API contracts. If an endpoint is broken, fix
the implementation — do not change the contract. If a contract change is truly
required, tag as `[CRITICAL]` and request explicit approval.

### Scope Boundary

DO NOT touch files outside the audit scope. Each finding MUST identify the
exact files to be modified. Changes to unrelated files (even "improvements")
are out of scope.

### Definition of Done

A task is complete ONLY when: the file is changed AND a verification command
passes (test suite, type check, lint, or manual verification). "Looks right"
is not done.

### Escalation Protocol

IF IN DOUBT: ask, don't act. When a finding's severity, scope, or fix approach
is ambiguous, escalate to the user with the specific question and the evidence
you have. Guessing in brownfield codebases causes regressions.

## Audit Scope

Brownfield audits cover: all `artifacts/` (portfolio, admin, api-server), all
`lib/` packages, all `supabase/migrations/`, root configuration, and CI/CD
pipelines. External dependencies (Supabase, Clerk) are audited for integration
correctness, not internal implementation.

## Governance

This constitution governs all brownfield audit activities. It supersedes
development workflow principles during audit mode. Amendments require explicit
user approval and version bump per semantic versioning: MAJOR for principle
removals/redefinitions, MINOR for additions, PATCH for clarifications.

Compliance review: every audit deliverable MUST be checked against all eight
principles before submission. Violations block delivery.

**Version**: 3.0.0 | **Ratified**: 2026-05-22 | **Last Amended**: 2026-05-22
