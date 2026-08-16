# AI Assistant Subsystem — Design Spec

- Date: 2026-08-16
- Status: Approved for planning
- Scope: Visitor chatbot, admin writing helper, contact spam scoring

## 1. Summary

Add real LLM-backed AI to Portfolio-Fixer on a **free** provider, replacing the
current heuristic `ai-assistant` (which is hardcoded keyword maps, not AI) with
three genuine capabilities that share one provider-agnostic integration layer:

1. **Chatbot** — a floating widget on the public portfolio that answers visitor
   questions **only about the site owner**, grounded in the live site content.
2. **Writing helper** — "generate / improve" buttons on text fields in the admin
   CMS (hero, about, projects, experience, and more).
3. **Spam scoring** — an AI spam score layered on top of the existing contact
   abuse controls, quarantining (never deleting) likely-spam messages.

All AI calls are proxied through the existing Express API server so the API key
never reaches the browser, and quota is protected centrally.

## 2. Provider selection

**Primary: xAI (Grok)** — the user already holds an API key.

- $25/month of free API credits on sign-up (the working quota for this project).
- OpenAI-compatible chat-completions endpoint at `https://api.x.ai/v1`, so
  integration is plain `fetch` with no SDK dependency.
- Default model: `grok-4.6` (flagship; ~500k context, configurable reasoning).
  A cheaper/faster alias may be set via `AI_MODEL` / `AI_SPAM_MODEL` to stretch
  credits.

**Alternatives (supported by config, not implemented now):** Groq (~14.4k
req/day free tier), OpenRouter, or a local Ollama server — any OpenAI-compatible
endpoint via `AI_BASE_URL`. Gemini uses a different API shape and is explicitly
out of scope for v1.

## 3. Architecture

```
portfolio ──POST /api/v1/chat──────────┐
admin     ──POST /api/v1/admin/ai/*──┐ │
contact   ──(POST /api/v1/contact)──┐ │ │
                                    ▼ ▼ ▼
                       Express API server (artifacts/api-server)
                          ┌───────────────────────────┐
                          │ lib/ai/client.ts          │  provider-agnostic
                          │ lib/ai/context.ts         │  site-content builder
                          │ lib/ai/prompts.ts         │  prompt templates
                          └───────────────────────────┘
                                    │ fetch (OpenAI-compat)
                                    ▼
                          xAI API  (AI_BASE_URL, AI_API_KEY, AI_MODEL)
```

Everything server-side. The frontends only call the API server.

## 4. Components

### 4.1 `src/lib/ai/client.ts` (new)

Provider-agnostic chat completion over plain `fetch`:

- `generateText({ messages, model?, maxTokens?, temperature? }) => Promise<string>`
- `generateJson<T>({ messages, model?, schema? }) => Promise<T>` — asks the model
  for JSON, strips code fences, parses, and validates against an optional Zod
  schema.
- Reads `env.AI_BASE_URL`, `env.AI_API_KEY`, `env.AI_MODEL`.
- Applies a timeout (`AI_TIMEOUT_MS`, default 20s chat/writing, 3s spam).
- `isAiConfigured()` helper: `AI_API_KEY` is set.
- On non-2xx/network error, throws a typed `AiError` with a stable code so
  callers can decide fallback behavior.

### 4.2 `src/lib/ai/context.ts` (new)

Builds the "about the owner" context used by the chatbot, from public tables via
the existing Supabase client (service role):

- `hero_content`, `about_content`, `skills`, `projects`, `experience`,
  `certifications`, `contact_info` (published/visible rows only).
- Returns a compact, token-bounded text block (name, role, bio, skills, project
  titles + one-line descriptions, experience, education, contact/social links).
- Cached in-memory for `AI_CONTEXT_TTL_MS` (default 60s) to avoid a DB round-trip
  per chat message. Cache misses surface as a degraded context, not a crash.

### 4.3 `src/lib/ai/prompts.ts` (new)

Central prompt templates:

- `chatSystemPrompt(context, name)` — "You are {name}'s assistant. Answer ONLY
  about {name} using the content below. Decline anything else politely. Never
  invent facts; if the content doesn't cover it, say so."
- `writingPrompt(contentType, text, instructions, context)` — templates per
  contentType (`hero`, `about`, `project`, `skill`, `experience`, `general`).
- `spamPrompt(name, email, message)` — returns JSON
  `{ spam: boolean, score: 0-100, reason: string }`.

### 4.4 `src/routes/public/chat.ts` (new)

Public, mounted under `/api/v1`:

- `GET /chat/config` → `{ success, data: { enabled } }` (no rate limit).
  `enabled = isAiConfigured() && env.AI_CHAT_ENABLED`.
- `POST /chat` (behind new `chatLimiter`):
  - Body: `{ messages: [{ role: "user"|"assistant", content: string }] }`.
  - Validates with a Zod schema; caps history to the last `AI_CHAT_MAX_TURNS`
    (default 10) and total content length.
  - Builds context + system prompt, calls `generateText`, returns
    `{ success, data: { reply } }`.
  - Returns `503` with a clear message when AI is not configured.

### 4.5 `src/routes/admin/ai.ts` (new)

Admin-only (behind `adminAuth` + `doubleCsrfProtection`), mounted under
`/api/v1/admin/ai`:

- `POST /generate` — body `{ contentType, instructions?, context? }` →
  `{ text }`.
- `POST /improve` — body `{ contentType, text, instructions? }` →
  `{ text }` (rewrite/polish the provided text).
- Returns `503` when AI is not configured or `AI_WRITING_ENABLED=false`.

The existing `/admin/ai-assistant/*` heuristic routes are **left untouched**
(they have tests + OpenAPI entries). The new router is a separate, real-LLM
surface. A later cleanup can retire the heuristics.

### 4.6 `src/routes/public/contact.ts` (modified)

After the existing checks pass and the message is inserted, when
`isAiConfigured() && env.AI_SPAM_ENABLED`, classify the message:

- Fire-and-forget (never awaited on the request path) with a short timeout.
- `generateJson` → `{ spam, score, reason }`; on any error/timeout, treat as
  not-spam and stop (never drop a real lead).
- If `score >= AI_SPAM_THRESHOLD` (default 75): update the row to set
  `is_spam = true`, `spam_score`, `spam_reason`. The message remains in the
  database and visible in the admin "Spam" filter.

### 4.7 `src/lib/env.ts` (modified)

Add typed accessors (all optional; AI features no-op when the key is absent):

| Var                            | Type   | Default                    |
| ------------------------------ | ------ | -------------------------- |
| `AI_BASE_URL`                  | string | `https://api.x.ai/v1`      |
| `AI_API_KEY`                   | string | (none — features disabled) |
| `AI_MODEL`                     | string | `grok-4.6`                 |
| `AI_SPAM_MODEL`                | string | `grok-4.6`                 |
| `AI_CHAT_ENABLED`              | bool   | `true`                     |
| `AI_WRITING_ENABLED`           | bool   | `true`                     |
| `AI_SPAM_ENABLED`              | bool   | `false` (opt-in)           |
| `AI_SPAM_THRESHOLD`            | int    | `75`                       |
| `AI_CHAT_RATE_LIMIT_MAX`       | int    | `20`                       |
| `AI_CHAT_RATE_LIMIT_WINDOW_MS` | int    | `900000` (15 min)          |
| `AI_CONTEXT_TTL_MS`            | int    | `60000`                    |
| `AI_TIMEOUT_MS`                | int    | `20000`                    |
| `AI_SPAM_TIMEOUT_MS`           | int    | `3000`                     |

### 4.8 `src/middleware/rateLimiter.ts` (modified)

Add `chatLimiter` using `AI_CHAT_RATE_LIMIT_MAX` / `AI_CHAT_RATE_LIMIT_WINDOW_MS`,
skipped when `DISABLE_RATE_LIMIT=true`. This protects the free quota from a
single abusive IP.

### 4.9 `supabase/migrations/049_ai_spam_scoring.sql` (new)

Add to `messages` (no enum change — avoids the `ALTER TYPE … ADD VALUE`
transaction hazard with existing CHECK constraints):

```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS spam_score INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS spam_reason TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_spam BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_messages_is_spam ON messages(is_spam) WHERE is_spam = true;
```

### 4.10 Portfolio: `ChatWidget` (new)

- `artifacts/portfolio/src/features/chat/components/ChatWidget.tsx` — a floating
  bubble (bottom-right; `WhatsAppFloat` already occupies bottom-left), modeled on
  `WhatsAppFloat.tsx`.
- On mount fetches `GET /api/v1/chat/config`; renders nothing when disabled.
- Chat panel with message list + input, calls `POST /api/v1/chat`, shows a
  loading state, and keeps the last `AI_CHAT_MAX_TURNS` turns client-side.
- Mounted in `App.tsx` next to `<WhatsAppFloat />`.
- Accessible: labelled toggle, focus management, escape-to-close.
- No persistence of conversation history (stateless per session).

### 4.11 Admin: `AiTextButton` (new)

- `artifacts/admin/src/features/ai/components/AiTextButton.tsx` — a reusable
  button that calls `/api/v1/admin/ai/improve` (and `/generate` for empty
  fields), returns the text to the parent form field via a callback.
- Wired into the text-heavy editors first: hero description, about bios,
  project description, experience description. Skill names/categories use
  `/generate` with `contentType: "skill"`. The component is generic so any text
  field can adopt it later ("everything").

### 4.12 Schemas, OpenAPI, generated client

- Add request/response Zod schemas to `lib/api-zod/src/admin.ts` (admin AI) and
  a new `lib/api-zod/src/chat.ts` (public chat), exported from `index.ts`.
- Add the endpoints to `lib/api-spec/openapi.yaml`.
- Regenerate `lib/api-client-react` (and `lib/api-zod/generated`) via Orval per
  the existing workflow.

## 5. API contracts

```
GET /api/v1/chat/config
  → 200 { success: true, data: { enabled: boolean } }

POST /api/v1/chat            (chatLimiter)
  req  { messages: [{ role: "user"|"assistant", content: string }] }
  → 200 { success: true, data: { reply: string } }
  → 400 { success: false, errors: { ... } }
  → 503 { success: false, message: "AI assistant is not configured" }
  → 429 rate limited

POST /api/v1/admin/ai/generate   (adminAuth + CSRF + admin limiters)
  req  { contentType: string, instructions?: string, context?: string }
  → 200 { success: true, data: { text: string } }

POST /api/v1/admin/ai/improve    (adminAuth + CSRF + admin limiters)
  req  { contentType: string, text: string, instructions?: string }
  → 200 { success: true, data: { text: string } }
```

`contentType` is a constrained enum: `hero | about | project | skill |
experience | general`. All responses follow the existing `{ success, data }` /
`{ success, message }` / `{ success, errors }` convention via
`lib/api-response.ts`.

## 6. Error handling & fallbacks

- **AI unconfigured** (no `AI_API_KEY`): `GET /chat/config` returns
  `enabled: false` (widget hides); `POST /chat` and admin AI return 503; contact
  spam scoring is skipped. Nothing else degrades.
- **LLM timeout / network / non-2xx**: chat returns 503 "assistant unavailable";
  admin returns 503; spam falls back to accepting the message as unread.
- **LLM returns invalid JSON** (spam/writing): retry once, then fall back as
  above. Chat is free-text so no JSON parsing is needed.
- **Rate limits (429 from the provider)**: mapped to a friendly 503 so the free
  quota ceiling is never mistaken for a server bug; logged at warn level.

## 7. Security

- API key is server-only; never exposed via `VITE_*`.
- Chat and admin AI inputs are Zod-validated and length-capped.
- Prompt injection: the chatbot is system-prompted to refuse off-topic requests
  and never to output raw system prompts or hidden content. Spam classification
  only returns structured JSON. Admin writing is owner-only.
- PII: existing logging rules apply — never log message bodies; spam logging
  records only `email_domain`, `spam_score`, and `spam_reason`.

## 8. Testing

- `lib/ai/client.test.ts` — `generateText`/`generateJson` with a mocked `fetch`
  (success, non-2xx, timeout, malformed JSON, fence stripping).
- `lib/ai/context.test.ts` — context builder with mocked Supabase (empty DB,
  full DB, token capping, cache TTL).
- `routes/public/chat.test.ts` — config enabled/disabled, validation, rate
  limit, 503 when unconfigured, 200 with mocked `generateText`.
- `routes/admin/ai.test.ts` — auth/CSRF required, generate/improve success and
  fallbacks.
- `contact.test.ts` additions — spam scoring sets `is_spam` above threshold,
  ignores below, and never fails the insert on LLM error.
- `api-zod` schema tests follow the existing `admin.test.ts` pattern.

## 9. Env & docs

- Add all `AI_*` vars to `artifacts/api-server/.env.example` and the root
  `.env.example`.
- Update `artifacts/api-server/README.md` (new env table + endpoints) and the
  main `README.md` tech-stack note.
- Note in `MANUAL_STEPS.md`/deploy docs that Vercel needs `AI_API_KEY` set.

## 10. Phasing

1. **Foundation** — `env.ts` accessors, `lib/ai/client.ts`, `lib/ai/prompts.ts`,
   unit tests.
2. **Chatbot** — `context.ts`, public chat routes, `chatLimiter`, portfolio
   `ChatWidget`, schemas/OpenAPI/client regen.
3. **Writing helper** — admin AI routes + `AiTextButton` wiring.
4. **Spam scoring** — migration 049, contact.ts integration, admin "Spam" filter.

Each phase lands independently and is fully tested before the next.

## 11. Non-goals (v1)

- Streaming/SSE responses (chat returns a single message).
- Persisted chat history or multi-turn server memory.
- Gemini / non-OpenAI-compatible adapters.
- Replacing the existing heuristic `ai-assistant` routes.
- Model fine-tuning, embeddings, or vector search.
