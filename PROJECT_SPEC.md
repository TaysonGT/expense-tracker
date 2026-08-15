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
   the user speaks (Web Speech API for web).
3. Full audio clip is cached locally on-device only (never uploaded), as a
   fallback for replay if transcription is wrong. Deleted on approval.
4. Transcribed text is sent to the backend. An LLM (Gemini free tier,
   structured JSON output via response_schema) parses it into separate
   `{title, cost}` entities — splitting multi-item sentences, leaving `cost`
   null when unspoken.
5. The same LLM call matches each parsed item against the user's *existing*
   categories (not a free/blind guess) — flags as uncertain if no good match.
6. Each parsed item becomes an `expense` record. If cost is missing or
   category is missing/uncertain, the record is `pending: true`.
7. Pending items surface in an Approval Queue. User confirms/edits title,
   category, and cost per item. Approving flips `pending` to `false`.
8. If upload/parsing fails, the item stays `failed` locally with a retry
   button — nothing is lost.

## Database Schema

**users**
- id, name, email, created_at

**categories**
- id, user_id (FK), name, is_default (bool), created_at

**expenses**
- id, user_id (FK)
- category_id (FK, nullable — null = pending category)
- title
- cost (nullable — null = pending cost)
- pending (boolean)
- source (enum: voice | manual)
- original_transcript (nullable text — voice-sourced items only)
- date
- created_at

## API Endpoints
- `POST /voice-entry` — accepts transcript, runs parsing + category-matching,
  creates pending expense(s)
- `GET /expenses/pending` — powers the approval queue
- `PATCH /expenses/:id/approve` — confirm title/category/cost, flip pending
  to false
- `GET /expenses` — full list, filterable by date range and category
- `CRUD /categories` — add / edit / delete categories

## Screens (v1)
1. **Home** — greeting, today's total spend + expense count in a prominent
   box, pending-items indicator/entry point inside that box, list of recent
   (non-pending) expenses below, "View all" link to Expenses page.
2. **Expenses** — full list of all expenses, filterable by category and day.
3. **Voice Capture** — record button, live partial captions while speaking,
   processing state, failed state with retry.
4. **Approval Queue** — per pending item: editable title, editable/
   confirmable category, cost input if missing, "view original transcript"
   / "replay audio" (if local cache still exists), approve action.
5. **Manual Add** — simple form: title, cost, category, date.
6. **Category Management** — list + add/edit/delete.

Bottom navigation: Home, Expenses, centered elevated (+) button (opens
"Record voice" / "Type manually" popup), Profile (placeholder), Settings
(placeholder).

## Explicitly Out of Scope for v1
- Authentication
- Analytics / spending insights

## Tech Stack
- Frontend: React + Tailwind CSS + Typescript
- Backend: Node.js / Express + Typescript + Typeorm
- Database: relational (Postgres/MySQL) or Supabase, per schema above
- STT: client-side (Web Speech API)
- Parsing/category-matching LLM: Gemini API free tier (structured JSON
  output)
