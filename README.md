# Voice-Powered Expense Tracker

Web MVP for logging expenses by voice. See [`PROJECT_SPEC.md`](./PROJECT_SPEC.md)
for the full product spec.

This repo is a scaffold: the project structure, database schema, API route
stubs, and a placeholder Home page are in place. Business logic (LLM parsing,
category matching, CRUD implementations) is not yet wired up.

## Structure

```
expense-tracker/
├── backend/     # Node.js / Express + TypeScript + TypeORM (Postgres)
├── frontend/    # React + Vite + Tailwind CSS + TypeScript
└── PROJECT_SPEC.md
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+ running locally (or reachable via connection settings)

## Backend

Location: `backend/`

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Copy the example env file and adjust values for your local Postgres:

```bash
cp .env.example .env
```

| Variable         | Default            | Description                    |
| ---------------- | ------------------ | ------------------------------ |
| `PORT`           | `4000`             | Express server port            |
| `DB_HOST`        | `localhost`        | Postgres host                  |
| `DB_PORT`        | `5432`             | Postgres port                  |
| `DB_USERNAME`    | `postgres`         | Postgres user                  |
| `DB_PASSWORD`    | `postgres`         | Postgres password              |
| `DB_NAME`        | `expense_tracker`  | Database name                  |
| `GEMINI_API_KEY` | _(empty)_          | Gemini API key (parsing, TODO) |

### 3. Create the database

```bash
createdb expense_tracker
```

### 4. Run migrations

Creates the `users`, `categories`, and `expenses` tables (schema per the spec):

```bash
npm run migration:run
```

To roll back the latest migration: `npm run migration:revert`.

### 5. Start the dev server

```bash
npm run dev
```

The API runs at `http://localhost:4000`. Health check: `GET /health`.

> The server will still start if the database isn't connected, so route stubs
> remain reachable during early development.

### API routes (stubs)

All routes currently return `501 Not Implemented`.

| Method  | Path                      | Purpose                                        |
| ------- | ------------------------- | ---------------------------------------------- |
| `POST`  | `/voice-entry`            | Parse transcript, create pending expense(s)    |
| `POST`  | `/expenses`               | Manual add (non-pending expense)               |
| `GET`   | `/expenses`               | List expenses (filter by date range, category) |
| `GET`   | `/expenses/pending`       | Approval queue                                 |
| `PATCH` | `/expenses/:id/approve`   | Confirm title/category/cost, unset pending     |
| `GET`   | `/categories`             | List categories                                |
| `POST`  | `/categories`             | Create category                                |
| `PATCH` | `/categories/:id`         | Edit category                                  |
| `DELETE`| `/categories/:id`         | Delete category                                |

## Frontend

Location: `frontend/`

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Start the dev server

```bash
npm run dev
```

The app runs at `http://localhost:5173`. Requests to `/api/*` are proxied to
the backend at `http://localhost:4000` (see `vite.config.ts`).

## Running both together

Use two terminals:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Then open `http://localhost:5173`.

## Notes

- Authentication and analytics are out of scope for v1 (per spec).
- Speech-to-text is client-side (Web Speech API); audio is cached on-device
  only and never uploaded.
