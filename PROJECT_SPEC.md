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
5. The same LLM call matches each parsed item against the *group's* existing
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

## Database Schema (Group-Based Multi-Tenant)

Expenses and categories belong to a **group** (the tenant boundary). A user
participates in groups via `group_memberships` with a role. All data access is
scoped by `group_id` for tenant isolation.

**users** (OAuth identities; no direct expense/category ownership)
- id (uuid)
- provider (varchar) — e.g. "google", "github"
- provider_id (varchar) — unique id at the provider
- email (varchar, unique)
- name (varchar)
- avatar_url (varchar, nullable)
- created_at
- (unique provider/provider_id pair)

**groups** (tenant boundary)
- id (uuid)
- name (varchar)
- currency (varchar(3), default 'USD')
- show_balance (boolean, default true)
- join_code (varchar(8), unique, auto-generated via Postgres `gen_join_code()`)
- created_at, updated_at

**group_memberships** (junction)
- id (uuid)
- group_id (FK -> groups, ON DELETE CASCADE)
- user_id (FK -> users, ON DELETE CASCADE)
- role (enum: 'admin' | 'viewer', default 'viewer')
- joined_at
- (unique [group_id, user_id])

**categories** (group-scoped)
- id, group_id (FK -> groups, required), name
- color (varchar, nullable), icon (varchar, nullable)
- is_base (boolean, default false) — seeded base categories cloned on group creation
- created_at
- (index on group_id)

**expenses** (group-scoped, created_by for audit)
- id, group_id (FK -> groups, required)
- created_by (FK -> users, non-nullable, ON DELETE RESTRICT — audit ref, not tenant owner)
- category_id (FK -> categories, nullable — null = pending category)
- title
- cost (nullable — null = pending cost; numeric(12,2), serialized as a
  string by Postgres)
- pending (boolean)
- source (enum: voice | manual)
- original_transcript (nullable text — voice-sourced items only)
- date
- created_at
- (index on group_id; index on created_by)

### Base categories
A fixed set of base categories is cloned into each new group on creation
(`is_base = true`). New custom categories within a group have `is_base = false`.
See `backend/src/lib/baseCategories.ts`.

### Group lifecycle
- `backend/src/lib/groups.ts` — `createGroup()` creates a group in a single
  transaction: generates a unique 8-char `join_code`, clones the base
  categories into it (`is_base = true`), and adds the creator as an `admin`
  member. `generateUniqueJoinCode()` / `generateJoinCode()` back the join
  codes (app-side); the DB also defaults `join_code` via a `gen_join_code()`
  function so raw inserts get a code.
  - `getGroupMembers(groupId)` returns `[{ userId, name, email, avatarUrl,
    role, joinedAt }]` ordered admin-first.
  - `updateGroup(groupId, patch)` applies name/currency/showBalance edits.
  - `getGroupPreviewByCode(code)` returns `{ name, currency, memberCount,
    adminName }` with an `alreadyMember` flag when the session user is in the
    group.

### Migration
- `1700000000001-GroupBasedSchema.ts` drops the v1 user-centric tables and
  creates the group-based schema. v1 had no auth and only a seeded dev user, so
  no data backfill is performed.
- Indexes: `IDX_expenses_group_id`, `IDX_categories_group_id`,
  `IDX_group_memberships_group_user` on `[group_id, user_id]`,
  `IDX_groups_join_code`, plus existing category_id/created_by/pending/date
  indexes on expenses.

## API Endpoints
All implemented (Express 5 + TypeORM). Authentication is enforced via a signed
JWT session cookie; data routes are scoped to the session's active group
(tenant isolation).

### Auth & Groups
- `POST /auth/:provider/callback` — provider ∈ {google, facebook}. Body
  `{ token }` (Google ID token or Facebook access token). Verifies the token
  server-side, find-or-creates the user, issues the session cookie (no active
  group yet). Returns `{ user, activeGroupId: null }`.
- `GET /auth/me` — current `{ user, activeGroupId, activeRole }`. Re-validates
  the session's active group is still a group the user belongs to; clears it
  otherwise. Requires auth.
- `POST /auth/logout` — clears the session cookie.
- `POST /auth/register` — body `{ email, password, name }`. Creates a local
  password user account and immediately logs them in. The session has no active
  group yet; the client then proceeds to group onboarding. 409 if the email is
  already registered.
- `POST /auth/login` — body `{ email, password }`. Verifies the local password
  against the stored hash. On success, sets the session cookie and returns user
  info. 401 for invalid credentials or when the user has no password hash
  (OAuth-only account).
- `GET /groups` — list the user's groups (My Groups) with role. Requires auth.
- `POST /groups` — create a group `{ name, currency?, showBalance? }`. Auto
  join_code, clones base categories, creator is admin, sets it active in the
  session. Requires auth.
- `POST /groups/join` — `{ joinCode }` (8-char). Creates a `viewer` membership
  (idempotent), sets it active. 404 for an unknown code. Requires auth.
- `POST /groups/:groupId/activate` — switch active group; requires membership
  (403 otherwise). Sets active_group_id + active_role in the session.
- `GET /groups/:groupId` — group details; requires membership (403 otherwise).
- `GET /groups/:groupId/members` — ordered member list with roles (admin first);
  requires membership.
- `PATCH /groups/:groupId` — { name?, currency?, showBalance? }; admin only, 403
  otherwise. Validates currency against the currencies list.
- `GET /groups/preview/:joinCode` — public-by-code preview of name, currency,
  member count and admin name. Requires auth to populate `alreadyMember`.

### Data (require valid session + active group)
- `POST /voice-entry` — body `{ transcript, date? }`. Runs Gemini/Groq parsing +
  category-matching against the group's categories, creates one expense per
  parsed item (`source: voice`), pending when cost or category is missing/
  uncertain. Returns the created expenses.
- `POST /expenses` — manual add, body `{ title, cost, categoryId, date? }`.
  Saved non-pending (`source: manual`) — user-confirmed, no approval flow.
- `GET /expenses` — full list, newest first. Query params: `categoryId`,
  `startDate`, `endDate`, `pending` ("true"|"false"). Includes joined
  category.
- `GET /expenses/pending` — powers the approval queue.
- `PATCH /expenses/:id` — general field edit (title/cost/categoryId/date).
- `PATCH /expenses/:id/approve` — body `{ title?, cost?, categoryId? }`.
  Requires cost and category; flips `pending` to false.
- `GET /categories` — list the group's categories.
- `POST /categories` — create category, body `{ name }`.
- `PATCH /categories/:id` — rename category, body `{ name }`.
- `DELETE /categories/:id` — delete category.

### Auth implementation notes
- `backend/src/lib/jwt.ts` — signs/verifies the session JWT (`userId`, `email`,
  and after group selection `activeGroupId` + `activeRole`). `JWT_SECRET`
  required in production.
- `backend/src/lib/session.ts` — httpOnly session cookie (Secure + SameSite=None
  in prod), also accepts `Authorization: Bearer` for non-cookie clients.
- `backend/src/lib/oauth.ts` — verifies Google (tokeninfo, audience check vs
  `GOOGLE_CLIENT_ID`) and Facebook (Graph API) tokens → normalized profile.
- `backend/src/lib/users.ts` — `findOrCreateUser()`, `findUserByEmail()`,
  `hashPassword()`, `verifyPassword()`, `setUserPassword()`.
- `backend/src/middleware/auth.ts` — `requireAuth`, `requireActiveGroup`,
  `requireGroupMembership` (403 non-members), `requireAdmin`, and
  `getRequestContext()` (resolves `{ userId, groupId }` for data routes).
- Frontend: `context/AuthContext.tsx` exposes `currentUser`, `currentGroup`,
  `currentRole`, `isAdmin`; `routes/ProtectedRoutes.tsx` redirects
  unauthenticated → `/auth` and authenticated-without-group →
  `/onboarding/groups`. `last_active_group` is persisted to localStorage.

## Screens (v1)
1. **Home** — greeting, today's total spend + expense count in a prominent
   box, pending-items indicator/entry point inside that box, list of recent
   (non-pending) expenses below, "View all" link to Expenses page. Empty vs.
   populated states distinguished by today's approved expense count; the
   empty state offers voice/manual input choices. Loading shows shimmer
   skeletons.
   *Implemented (live data).*
2. **Expenses** — full list of all expenses, filterable by category (pill strip)
   and a date range (selected via a header button that opens DateFilterModal:
   presets All/Today/This Week/This Month + custom start/end). Inline-editable
   rows, a reactive insights block (summary strip, category breakdown, per-day
   chart) computed client-side. Backed by PATCH /expenses/:id.
   *Implemented (routed at /expenses).*
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
6. **Profile** — mock page (no auth backend yet): avatar + name/email hero,
   this-month stats summary, My Groups quick-switch (activates via the shared
   group-switch overlay), Settings-style action list. Routed at /profile.
   *Implemented (v1).*
7. **Group Management** (`/group`) — shows the active group's members (role
   badges; admin-first ordering) and an edit form for name, currency, and
   show-balance toggle. Includes the group's join code + a shareable direct
   link (`/join/:code`). Admin-only for edits.
   *Implemented.*
8. **Group Join** (`/join/:code`) — shareable direct-link page: previews a
   group by join code (name, currency, member count, admin name) and offers a
   Join button (or "already a member"). Auth required; the route is reachable
   without an active group (uses RequireAuth guard) so invitees land here,
   sign in, then join. Redirect after success goes to /home.
   *Implemented.*
9. **Settings** (`/settings`) — appearance + account actions stub.
   *Implemented.*
10. **Category Management** — list + add/edit/delete. *Backend CRUD done; UI
   not yet built.*

**Shared group-switch overlay.** Switching the active group (via Profile's My
Groups list, the GroupSelector dropdown, or OnboardingGroups' enter button)
triggers a fullscreen animated overlay from `GroupSwitchProvider`:
"Switching to \<name\>" (spinner) → "Successfully switched" (checkmark) →
navigates to `/home`. The provider also invalidates the session query and
TanStack Query caches for `['expenses']`/`['categories']`, so the home page
refetches fresh data on arrival. OnboardingGroups additionally uses a direct
activate call so its own modal flow (`onEntered`) can run after the switch.

### Bottom navigation & header
- Bottom nav: Home, Expenses, centered elevated (+) button (opens "Record voice"
/ "Type manually" popup — implemented with appear animation), Pending, Profile.
- `GroupSelector` sits in page headers (Home/Profile/Expenses): shows the
  active group's name + currency, opens a dropdown with My Groups (with the
  shared switch overlay), a "Manage group" link to `/group`, and Create/Join
  buttons. Dropdown closes on outside click / Escape and animates with a
  scale + translate-y transition matching the `AddMenu` pattern.

## Explicitly Out of Scope for v1
- Analytics / spending insights beyond the client-computed Expenses insights.

### Auth & onboarding (implemented)
OAuth (Google + Facebook) sign-in at `/auth`, then a mandatory group
onboarding step at `/onboarding/groups` (Create / Join / My Groups) before any
expense data is reachable. The onboarding UI is split into reusable
`CreateGroupModal` and `JoinGroupModal` components. `AuthGuard` preserves a
`location.state.from` so a visitor bounced from a protected URL (e.g. a share-
able join link at `/join/:code`) returns to it after signing in.
`RequireAuth` guards routes that need authentication but not an active group;
`OnboardingGuard` guards the group-onboarding step. `backend/src/lib/devUser.ts`
is no longer wired into the data routes.

## Brand
Product name: **Ahora — Expense Tracker with AI**. The logo/name appears in the
auth screen hero and in the Group Management header; no standalone logo asset,
so a styled wordmark (gradient + AI accent) is used inline.

## Tech Stack
- Frontend: React 19 + Vite 8 + Tailwind CSS 4 + TypeScript 7 + react-router 8;
  data fetching via axios + TanStack Query (QueryClientProvider in main.tsx).
  Currency symbols/digits come from `frontend/src/data/currencies.json`.
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
