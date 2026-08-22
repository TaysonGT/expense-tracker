# WhisperTrack | Expense Tracker

A voice-powered expense tracking application for groups. Capture expenses instantly with your voice, organize them in shared groups, and manage them collaboratively.

## Features

### Voice Capture
- **Live transcription** — Real-time speech-to-text using Web Speech API (Chromium browsers)
- **Smart parsing** — LLM-powered extraction of items, costs, categories from natural language
- **Approval queue** — Review and confirm parsed items before they're saved
- **All caught up state** — Satisfying completion feedback when all items are approved

### Group Expense Management
- **Shared groups** — Create groups, invite members via 8-character join codes or shareable links
- **Role-based permissions** — Three roles with granular permissions:
  - **Admin** — Full control: manage members, change roles, kick members, all expense actions
  - **Read/Write** — Add/edit/remove own expenses, create/edit categories, read all data
  - **Read Only** — View-only access to expenses and group data
- **Multi-currency support** — 150+ currencies with native symbols
- **Expense CRUD** — Create, read, update, delete with inline editing
- **Category management** — Custom categories with colors/icons

### Voice + Manual Entry
- **Voice capture** — Speak naturally ("lunch for $12.50, coffee for $3")
- **Manual entry** — Traditional form for precise entry
- **Pending approval** — Items without cost/category go to approval queue

### Group Management
- **Member management** — Admins can change roles, kick members
- **Join codes** — 8-character codes for easy sharing
- **Shareable join links** — `/join/:code` pages for frictionless onboarding
- **Group settings** — Name, currency, balance visibility

### User Experience
- **Animated overlays** — Smooth loading/success/error feedback (GroupSwitchOverlay, ActionOverlay)
- **Responsive design** — Mobile-first, works on desktop and mobile
- **Dark/light logos** — WhisperTrack branding with SVG assets
- **Real-time updates** — TanStack Query for automatic cache invalidation

## Tech Stack

### Frontend
- **React 19** + **Vite 8** + **TypeScript 7**
- **Tailwind CSS 4** — Utility-first styling
- **React Router 8** — Client-side routing with guards
- **TanStack Query** — Server state management & caching
- **Axios** — HTTP client with interceptors
- **Lucide React** — Icon library

### Backend
- **Node.js** + **Express 5** + **TypeScript 5.7**
- **TypeORM** — Database ORM with migrations
- **PostgreSQL** — Primary database (Supabase in dev)
- **JWT** — HttpOnly session cookies
- **OAuth** — Google + Facebook authentication

### AI / Voice
- **Groq** (preferred) — Llama 3.3 70B via OpenAI-compatible API
- **Gemini** (fallback) — Google GenAI with structured JSON output
- **Web Speech API** — Client-side speech recognition

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Groq API key (or Gemini API key for fallback)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure DB, JWT_SECRET, GROQ_API_KEY
npx tsx backend/src/migrations/*.ts  # Run migrations
npm run dev  # Starts on port 4000 with file watching
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env  # Configure VITE_API_URL, OAuth client IDs
npm run dev  # Starts on port 5173 with API proxy to backend
```

### Environment Variables

**Backend (`.env`)**
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=expense_tracker
JWT_SECRET=your-secret-key
GROQ_API_KEY=gsk_...  # or GEMINI_API_KEY
GOOGLE_CLIENT_ID=...
FACEBOOK_APP_ID=...
```

**Frontend (`.env`)**
```env
VITE_API_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=...
VITE_FACEBOOK_APP_ID=...
```

## Project Structure

```
expense-tracker/
├── backend/
│   ├── src/
│   │   ├── entities/          # TypeORM entities
│   │   ├── lib/               # Business logic (groups, users, voice parsing)
│   │   ├── middleware/        # Auth guards, role checks
│   │   ├── routes/            # Express routes
│   │   └── migrations/        # TypeORM migrations
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── context/           # React context providers
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # API client, queries, formatters
│   │   ├── pages/             # Route components
│   │   ├── routes/            # Route guards
│   │   └── types.ts           # Shared types
│   └── package.json
└── PROJECT_SPEC.md            # Full specification
```

## Key Features Detail

### Role-Based Access Control
| Action | Admin | Read/Write | Read Only |
|--------|-------|------------|-----------|
| Create expense | ✅ | ✅ | ❌ |
| Edit own expense | ✅ | ✅ | ❌ |
| Edit any expense | ✅ | ❌ | ❌ |
| Delete own expense | ✅ | ✅ | ❌ |
| Delete any expense | ✅ | ❌ | ❌ |
| Manage categories | ✅ | ✅ | ❌ |
| Change member roles | ✅ | ❌ | ❌ |
| Kick members | ✅ | ❌ | ❌ |
| Delete group | ✅ | ❌ | ❌ |
| View all data | ✅ | ✅ | ✅ |

### Authentication Flow
1. User signs in via OAuth (Google/Facebook) or email/password
2. Session cookie set (httpOnly, Secure, SameSite=None)
3. If no active group → redirected to `/onboarding/groups`
4. Create/join/select group → set as active group in session
5. Access to `/home`, `/expenses`, `/voice`, etc. granted

### Voice Parsing Pipeline
1. User speaks → Web Speech API transcribes live
2. Transcript sent to `POST /voice-entry`
3. Backend dispatches to Groq (preferred) or Gemini
4. LLM returns structured `ParsedEntity[]` with title, cost, category, uncertainty
5. Items with missing cost/category → `pending: true`
6. Approval queue shows items for user confirmation

### Database Migrations
- `1700000000000-InitSchema` — Initial schema
- `1700000000001-GroupBasedSchema` — Group-based multi-tenant schema
- `1700000000002-AddPasswordHash` — Password hash column
- `1700000000003-UpdateGroupRoleEnum` — Role enum: admin/read_write/readonly

## API Endpoints Summary

### Auth & Groups
- `POST /auth/:provider/callback` — OAuth callback
- `GET /auth/me` — Current session
- `POST /auth/logout` — Logout
- `POST /auth/register` — Local registration
- `POST /auth/login` — Local login
- `GET /groups` — List user's groups
- `POST /groups` — Create group
- `POST /groups/join` — Join by code
- `POST /groups/:groupId/activate` — Switch active group
- `GET /groups/:groupId/members` — List members
- `PATCH /groups/:groupId` — Update group (admin)
- `DELETE /groups/:groupId/members/:userId` — Kick member (admin)
- `PATCH /groups/:groupId/members/:userId` — Change role (admin)

### Expenses
- `POST /expenses` — Create (read_write/admin)
- `GET /expenses` — List with filters
- `GET /expenses/pending` — Approval queue
- `PATCH /expenses/:id` — Edit (owner/admin)
- `PATCH /expenses/:id/approve` — Approve (read_write/admin)
- `DELETE /expenses/:id` — Delete (owner/admin)

### Categories
- `GET /categories` — List
- `POST /categories` — Create (read_write/admin)
- `PATCH /categories/:id` — Update (read_write/admin)
- `DELETE /categories/:id` — Delete (read_write/admin)

## Development

```bash
# Backend
cd backend && npm run dev      # Watch mode with tsx
cd backend && npm run build    # TypeScript compile

# Frontend
cd frontend && npm run dev     # Vite dev server
cd frontend && npm run build   # Production build
cd frontend && npm run typecheck  # TypeScript check
```

## Deployment Notes

- **Backend**: Compile with `npm run build`, run `node dist/app.js`
- **Frontend**: Build with `npm run build`, serve `dist/` via nginx/CDN
- **Database**: Run migrations with `npx tsx backend/src/migrations/*.ts`
- **Environment**: Ensure all required env vars are set in production

## License

MIT