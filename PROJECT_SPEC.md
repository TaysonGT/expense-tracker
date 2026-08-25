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
- role (enum: 'admin' | 'read_write' | 'readonly', default 'readonly')
- joined_at
- (unique [group_id, user_id])

### Role Permissions
- **admin**: Full access — can change member roles, kick members, delete group, create/edit/delete any expense, manage categories, all data access.
- **read_write**: Can add/edit/remove own expenses, read all expenses, create/edit/delete categories, read all data.
- **readonly**: Read-only access to all expenses, categories, and group data.

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
  - `joinGroupByCode(userId, code)` — joins group as `readonly` (default).
  - `updateGroupMember(groupId, userId, { role })` — admin-only role change.
  - `kickMember(groupId, userId)` — admin-only member removal.

### Migration
- `1700000000001-GroupBasedSchema.ts` drops the v1 user-centric tables and
  creates the group-based schema. v1 had no auth and only a seeded dev user, so
  no data backfill is performed.
- `1700000000002-AddPasswordHash.ts` adds `password_hash` column to `users`.
- `1700000000003-UpdateGroupRoleEnum.ts` — migrates `group_role` enum from
  `('admin', 'viewer')` to `('admin', 'read_write', 'readonly')`; converts
  existing `'viewer'` rows to `'readonly'`; changes default to `'readonly'`.
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
  read_write/admin can edit; users can only edit their own expenses unless admin.
- `PATCH /expenses/:id/approve` — body `{ title?, cost?, categoryId? }`.
  Requires cost and category; flips `pending` to false. Requires read_write/admin.
- `DELETE /expenses/:id` — delete an expense. Admin can delete any; read_write
  can delete own; readonly cannot delete.
- `GET /categories` — list the group's categories.
- `POST /categories` — create category, body `{ name }`. Requires read_write/admin.
- `PATCH /categories/:id` — rename category, body `{ name }`. Requires read_write/admin.
- `DELETE /categories/:id` — delete category. Requires read_write/admin.

### Group Member Management (admin only)
- `DELETE /groups/:groupId/members/:userId` — kick a member from the group.
  Admin only; cannot kick self or another admin.
- `PATCH /groups/:groupId/members/:userId` — change member's role.
  Body: `{ role: "admin" | "read_write" | "readonly" }`. Admin only; cannot change own role or demote another admin.

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
  `requireActiveGroupMembership` (verifies membership on active group),
  `requireGroupMembership` (for explicit :groupId routes), `requireAdmin`,
  `requireRole(...roles)`, and `getRequestContext()`.
- Frontend: `context/AuthContext.tsx` exposes `currentUser`, `currentGroup`,
  `currentRole`, `isAdmin`; `routes/ProtectedRoutes.tsx` redirects
  unauthenticated → `/auth` and authenticated-without-group →
  `/onboarding/groups`. `last_active_group` is persisted to localStorage.

## Screens (v1)
1. **Home** — greeting, today's total spend + expense count in a prominent
   box, pending-items indicator/entry point inside that box, list of recent
   (non-pending) expenses below, "View all" link to Expenses page. The recent
   list uses the shared `ExpenseListItem` (inline-edit) rows inside a
   scrollable container. Empty vs. populated states are keyed on the recent-
   expenses count, not today's count; the empty state offers voice/manual
   input choices. Loading shows shimmer skeletons. Header holds the
   `default-monochrome.svg` logo + GroupSelector.
   *Implemented (live data).*
2. **Expenses** — full list of all expenses, filterable by category (pill strip)
   and a date range (selected via a header button that opens DateFilterModal:
   presets All/Today/This Week/This Month + custom start/end). Inline-editable
   rows, a reactive insights block (summary strip, category breakdown, per-day
   chart) computed client-side. Backed by PATCH /expenses/:id.
   Each row has a three-dot options menu (edit / delete / created by).
   *Implemented (routed at /expenses).*
3. **Voice Capture** — immersive dark capture stage (no bottom nav; header is
   back button + theme-aware logo). "Whisper your expenses." prompt, mic that
   smoothly swaps to a spinning square while recording, CSS-animated sound
   waves, live transcript (finalized + interim) fading in over the prompt,
   and an orb animation during LLM processing — all as permanently-mounted
   layers that cross-fade instead of popping.
   Distinct failure states:
   - "No text detected" — nothing was transcribed/heard (or the parse came
     back empty); Try again re-runs recording.
   - Processing failure — Retry parsing (last transcript) + Record again.
   Back button during recording cancels without processing anything.
   Readonly members see AddNotAllowed instead of the stage.
   In review, each `EntityCard` is a `<form>` so approving submits on Enter,
   shows a per-card loading state while approving, and a removed state when
   deleted (tracked via `removedIds` rather than immediate list filtering).
   After the last item is approved, the review screen flips to an
   "all caught up" state (success checkmark + "View all expenses").
   *Implemented (routed at /voice).*
4. **Approval Queue** — per pending item: editable title, editable/
   confirmable category, cost input if missing, "view original transcript"
   / "replay audio" (if local cache still exists), approve action.
   *Partially covered by the Voice Capture review step; dedicated queue
   screen not yet built.*
5. **Manual Add** — simple form: title, cost, category, date. Saves directly
   (non-pending). *Implemented (routed at /manual).*
6. **Profile** — avatar + name/email hero card, the active group's badge,
   a "My Groups" quick-switch list (activates via the shared group-switch
   overlay), and a settings-style action list (Settings / Privacy /
   Help / Log out). The this-month stats summary was removed; header shows
   the monochrome logo instead of a title. Routed at /profile.
   *Implemented (v1).*
7. **Group Management** (`/group`) — shows the active group's members (role
   badges; admin-first ordering) and an edit form for name, currency, and
   show-balance toggle. Includes the group's join code + a shareable direct
   link (`/join/:code`). Admin-only for edits. Admin can change member roles
   (admin/read_write/readonly) via dropdown; actions show loading/success
   feedback via the shared ActionOverlay.
   *Implemented.*
8. **Group Join** (`/join/:code`) — shareable direct-link page: previews a
   group by join code (name, currency, member count, admin name) and offers a
   Join button (or "already a member"). Auth required; the route is reachable
   without an active group (uses RequireAuth guard) so invitees land here,
   sign in, then join. Success plays the shared switch overlay and lands on
   /home. *Implemented.*
9. **Settings** (`/settings`) — appearance + account actions stub, category
   management entry. Header shows the monochrome logo.
   *Implemented.*
10. **Category Management** — list + add/edit/delete, as an animated bottom
   sheet (`CategoryManagementModal`, slide-up + fade, close on backdrop/
   Escape) opened from Settings or the CategorySelect "manage" button. The
   dropdown no longer renders a placeholder option.
   *Implemented (UI + CRUD).*

**Shared group-switch overlay.** *Every* path that changes the active group
routes through `GroupSwitchProvider` (`context/GroupSwitchContext.tsx`) so the
animated fullscreen overlay plays consistently: "Switching to \<name\>"
(spinner) → "Successfully switched" (checkmark) → navigate to `/home`.

Entry points:
- Profile "My Groups" list and the GroupSelector dropdown → `switchToGroup(g)`
  (runs the activate mutation itself, `POST /groups/:id/activate`).
- OnboardingGroups "My Groups" tab → same activate path.
- Create / Join flows (OnboardingGroups Create/Join tabs and the `/join/:code`
  invite page) → `switchToGroup(g, { skipActivate: true })`: the backend has
  *already* set the group active in the session, so no extra POST is made —
  the overlay + navigation still play.

On success the provider also calls `removeQueries(['expenses'])` +
`removeQueries(['categories'])` before invalidating, so Home lands on its
loading/empty state with no stale rows from the previously active group, then
refetches the new tenant's data on arrival.

**ActionOverlay.** A reusable fullscreen loading/success/error overlay
(`components/ActionOverlay.tsx`, provider in `App.tsx`) for any async action.
Exposed via `useActionOverlay().runWithOverlay(action, options)`. Used for:
- Group member role changes (GroupManagement)
- Expense deletion (ExpenseListItem)
- Future: group deletion, member kick, logout, etc.

Overlay shows: loading spinner → success checkmark → auto-close (configurable),
or error state with custom message.

### Bottom navigation & header
- Bottom nav: Home, Expenses, centered elevated (+) button (opens "Record voice"
/ "Type manually" popup — implemented with appear animation), Pending, Profile.
  Hidden on the immersive `/voice` capture screen (opt-out in
  `ProtectedRoutes` via pathname check).
- `GroupSelector` sits in page headers (Home/Profile/Expenses/Pending):
  shows the active group's name, opens a dropdown with My Groups (with the
  shared switch overlay), a "Manage group" link to `/group`, and Create/Join
  buttons. Dropdown closes on outside click / Escape and animates with a
  scale + translate-y transition matching the `AddMenu` pattern.

## Theming
Full light/dark theming driven by CSS variables and Tailwind utilities.

- **Tokens** (`frontend/src/index.css`): semantic variables — `--background`,
  `--foreground`, `--card`, `--card-light`, `--card-hover`, `--muted`,
  `--muted-foreground`, `--accent`, `--accent-dark`, `--accent-light`,
  `--primary`, `--danger`, `--warning`, `--warning-secondary`, `--skeleton`,
  `--border-primary`, `--border-light`, `--empty-title`, `--empty-subtitle`,
  `--shadow-one`, `--link` — mapped into Tailwind utilities through `@theme`
  (`bg-background`, `bg-card`, `text-primary`, `text-empty-title`,
  `border-border`, `bg-skeleton`, `text-danger`, …). All screens use these
  tokens instead of hardcoded grays/whites, so the whole app re-skins
  automatically.
- **Theme variants**: values defined under `:root` (light) and `.dark`.
- **Accent variants**: `.theme-green` overrides `--primary`
  (+ `.dark.theme-green`); more accents can be added the same way. The default
  accent key is `theme-blue` (no override class needed).
- **ThemeProvider** (`context/ThemeContext.tsx`): persists `theme` and
  `accent` to localStorage (keys: `theme`, `accent`), applies both as classes
  on `<html>`, and exposes `useTheme()` → `{ theme, toggleTheme, setAccent,
  accent, logo }`. `logo` resolves per theme (`default-monochrome-white.svg`
  in dark, `default-monochrome.svg` in light) so headers stay legible.
- **Provider order** (App.tsx): `BrowserRouter > ThemeProvider > AuthProvider
  > GroupSwitchProvider > ActionOverlayProvider > Routes`.

### Test playgrounds (unauthenticated dev routes)
- `/test` — `VolumeMeter` mic-level visualizer experiment.
- `/test-voice` — `VoiceTest`, the design playground the production voice
  capture stage was built from.

## Explicitly Out of Scope for v1
- Analytics / spending insights beyond the client-computed Expenses insights.

### Auth & onboarding (implemented)
OAuth (Google + Facebook) sign-in at `/auth`, then a mandatory group
onboarding step at `/onboarding/groups` (My Groups / Create / Join tabs)
before any expense data is reachable. The onboarding screen uses inline
Create/Join panels; the extracted `CreateGroupModal` / `JoinGroupModal`
components are used by the GroupSelector dropdown in the app.
`AuthGuard` preserves a
`location.state.from` so a visitor bounced from a protected URL (e.g. a share-
able join link at `/join/:code`) returns to it after signing in.
`RequireAuth` guards routes that need authentication but not an active group;
`OnboardingGuard` guards the group-onboarding step. `backend/src/lib/devUser.ts`
is no longer wired into the data routes.

**Active group membership verification.** Data routes (`/expenses`, `/categories`)
use `requireActiveGroupMembership` middleware which combines `requireActiveGroup`
with a live membership check on the session's `activeGroupId`. This closes the
gap where `requireActiveGroup` only checked for presence of `activeGroupId`
without re-verifying the user is still a member. Group-specific routes
(`/groups/:groupId/*`) continue to use `requireGroupMembership` on the
explicit `:groupId` parameter.

## Brand
Product name: **WhisperTrack | Expense Tracker** (formerly "Ahora — Expense
Tracker with AI"). Branding is delivered as SVG logo assets in
`frontend/public/` (the `AhoraLogo` React component was removed):

- `default.svg` — full-color logo, used on the auth (`/auth`) screen hero.
- `default-monochrome.svg` — monochrome variant, used in the page headers of
  Home, Profile, Settings, and Group Management.
- `icon.svg` — favicon (`<link rel="icon">` in `index.html`).
- `default-monochrome-{black,white,vertical}.svg` — additional variants kept
  for future use (e.g. light/dark or vertical lockups).

`index.html` sets the browser title to "WhisperTrack | Expense Tracker".

## Tech Stack
- Frontend: React 19 + Vite 8 + Tailwind CSS 4 + TypeScript 7 + react-router 8;
  data fetching via axios + TanStack Query (QueryClientProvider in main.tsx).
  Currency symbols/digits come from `frontend/src/data/currencies.json`;
  `formatCurrency()` falls back to a plain 2-decimal number when no currency
  code is given. Styling is token-based — semantic Tailwind utilities backed
  by CSS variables (see **Theming**) with light/dark modes and accent
  variants; no hardcoded grays in screens.
- Backend: Node.js / Express 5 + TypeScript 5.7 (downgraded from TS 7 for
  deployment compatibility) + TypeORM
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
  (`node --watch dist/app.js`); `ts-node` is incompatible with TypeScript 7,
  so migration scripts run via `npx tsx` (`backend/src/migrations/*.ts`).
- Backend was downgraded to TypeScript 5.7 for deployment compatibility.
- Frontend dev proxies `/api/*` to the backend on port 4000 (Vite).
