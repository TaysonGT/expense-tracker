# Voice-Powered Expense Tracker — Web MVP Spec

## Problem
Users (especially during busy moments like grocery shopping) forget expenses
entirely if not logged immediately. Capturing *what* was bought must be
instant (voice), while *how much* it cost can be filled in later. Remembering
that a purchase happened is much harder to recover than remembering its cost.

## Core Flow
1. User speaks a full sentence (e.g. "lemons and potatoes for $1.50, uh,
   mangoes and some milk").
2. Client-side speech-to-text transcribes live, showing partial captions as
   the user speaks (Web Speech API for web — Chromium browsers only).
3. Full audio clip is cached locally on-device only (never uploaded), as a
   fallback for replay if transcription is wrong. Deleted on approval.
   *(Not yet implemented — v1 relies on the live transcript.)*
4. Transcribed text is sent to the backend (`POST /voice-entry`). An LLM
   (Gemini, structured JSON output via `responseSchema`) parses it into
   separate `{title, cost, categoryId, categoryUncertain}` entities —
   splitting multi-item sentences, leaving `cost` null when unspoken.
5. The same LLM call matches each parsed item against the user's *existing*
   categories (not a free/blind guess) — flags as uncertain if no good match.
   Hallucinated category ids are discarded server-side.
6. Each parsed item becomes an `expense` record. If cost is missing or
   category is missing/uncertain, the record is `pending: true`.
7. Pending items surface in an Approval Queue. User confirms/edits title,
   category, and cost per item. Approving flips `pending` to `false`
   (`PATCH /expenses/:id/approve`). An "approve later" action leaves the
   item pending for the queue.
8. If upload/parsing fails, the user lands on a failed state with a retry
   button that re-runs the last transcript — nothing is lost.

## Database Schema

**users**
- id, name, email, created_at

**categories**
- id, user_id (FK), name, is_default (bool), created_at

**expenses**
- id, user_id (FK)
- category_id (FK, nullable — null = pending category)
- title
- cost (nullable — null = pending cost; numeric(12,2), serialized as a
  string by Postgres)
- pending (boolean)
- source (enum: voice | manual)
- original_transcript (nullable text — voice-sourced items only)
- date
- created_at

## API Endpoints
All implemented (Express 5 + TypeORM). No auth in v1 — every request is
scoped to a single seeded dev user (see Out of Scope).

- `POST /voice-entry` — body `{ transcript, date? }`. Runs Gemini parsing +
  category-matching against the user's categories, creates one expense per
  parsed item (`source: voice`), pending when cost or category is missing/
  uncertain. Returns the created expenses.
- `POST /expenses` — manual add, body `{ title, cost, categoryId, date? }`.
  Saved non-pending (`source: manual`) — user-confirmed, no approval flow.
- `GET /expenses` — full list, newest first. Query params: `categoryId`,
  `startDate`, `endDate`, `pending` ("true"|"false"). Includes joined
  category.
- `GET /expenses/pending` — powers the approval queue.
- `PATCH /expenses/:id/approve` — body `{ title?, cost?, categoryId? }`.
  Requires cost and category; flips `pending` to false.
- `GET /categories` — list categories (used by the client for dropdowns and
  by Gemini for matching).
- `POST /categories` — create category, body `{ name }`.
- `PATCH /categories/:id` — rename category, body `{ name }`.
- `DELETE /categories/:id` — delete category.

## Screens (v1)
1. **Home** — greeting, today's total spend + expense count in a prominent
   box, pending-items indicator/entry point inside that box, list of recent
   (non-pending) expenses below, "View all" link to Expenses page.
   *Implemented (live data).*
2. **Expenses** — full list of all expenses, filterable by category and day.
   *Not yet built.*
3. **Voice Capture** — record button, live partial captions while speaking,
   processing state, failed state with retry, then an editable review of the
   parsed entities (title/category/cost), approve per item or approve later.
   *Implemented (routed at /voice).*
4. **Approval Queue** — per pending item: editable title, editable/
   confirmable category, cost input if missing, "view original transcript"
   / "replay audio" (if local cache still exists), approve action.
   *Partially covered by the Voice Capture review step; dedicated queue
   screen not yet built.*
5. **Manual Add** — simple form: title, cost, category, date. Saves directly
   (non-pending). *Implemented (routed at /manual).*
6. **Category Management** — list + add/edit/delete. *Backend CRUD done; UI
   not yet built.*

Bottom navigation: Home, Expenses, centered elevated (+) button (opens
"Record voice" / "Type manually" popup — implemented), Profile (placeholder),
Settings (placeholder).

## Explicitly Out of Scope for v1
- Authentication — the backend lazily seeds a single dev user plus default
  categories on first run and scopes all requests to it
  (`backend/src/lib/devUser.ts`). **Must be replaced before any production
  exposure.**
- Analytics / spending insights

## Tech Stack
- Frontend: React 19 + Vite + Tailwind CSS 4 + TypeScript 7 + react-router 8;
  data fetching via axios + TanStack Query (QueryClientProvider in main.tsx)
- Backend: Node.js / Express 5 + TypeScript + TypeORM
- Database: Postgres (Supabase in dev, SSL-enabled) per schema above
- STT: client-side (Web Speech API), no audio uploaded
- Parsing/category-matching LLM: hybrid, chosen once at startup via a single
  dispatcher (`backend/src/lib/voiceParser.ts`) so the route is provider-
  agnostic and both paths return the identical `ParsedEntity[]` shape.
  - **Groq (preferred)** — used when `GROQ_API_KEY` is set and non-empty.
    OpenAI-compatible SDK pointed at `https://api.groq.com/openai/v1`, default
    model `llama-3.3-70b-versatile` (overridable via `GROQ_MODEL`),
    `response_format: { type: "json_object" }`. Since Groq doesn't enforce a
    schema, the prompt spells out the exact shape and the parsed JSON is
    validated in code (array shape, field types, category ids checked against
    the user's real categories).
  - **Gemini (fallback)** — used when `GROQ_API_KEY` is unset. `@google/genai`
    SDK with structured JSON output via `responseSchema`; default model
    `gemini-3.5-flash`, overridable via `GEMINI_MODEL`.
  - Fallback rule: provider selection is a stable startup-time decision. If the
    selected provider's API call fails at request time, the request fails (the
    client lands on its retry state) — there is no per-request provider switch.

## Development notes
- Backend dev runs the compiled output with file watching
  (`node --watch dist/app.js`) — `ts-node` is incompatible with TypeScript 7.
- Frontend dev proxies `/api/*` to the backend on port 4000 (Vite).
