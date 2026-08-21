/**
 * Shared domain types for the frontend, mirroring the backend schema
 * (see PROJECT_SPEC.md — Database Schema).
 */

export type ExpenseSource = "voice" | "manual";

export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
}

/**
 * Expense as returned by the backend. `cost` comes back as a numeric string
 * (Postgres numeric) or null; the API hooks normalize it to a number|null.
 */
export interface Expense {
  id: string;
  categoryId: string | null;
  category?: Category | null;
  title: string;
  cost: number | null;
  pending: boolean;
  source: ExpenseSource;
  originalTranscript: string | null;
  date: string; // ISO yyyy-mm-dd
  /** Creator's display name (from joined creator relation) */
  createdByName?: string;
}

/**
 * A single item as parsed by the LLM from a voice transcript, before it is
 * approved into an Expense. `cost` is null when unspoken; `categoryId` is null
 * when no confident match was found. `categoryUncertain` flags a weak match
 * that the user should confirm.
 */
export interface ParsedEntity {
  id: string; // client-side temp id
  title: string;
  cost: number | null;
  categoryId: string | null;
  categoryUncertain: boolean;
}

/* ------------------------------ Auth / Groups ----------------------------- */

export type GroupRole = "admin" | "read_write" | "readonly";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface Group {
  id: string;
  name: string;
  currency: string;
  showBalance: boolean;
  joinCode: string;
  role: GroupRole;
}

/** Response shape of GET /auth/me and the OAuth callback. */
export interface SessionInfo {
  user: User;
  activeGroupId: string | null;
  activeRole: GroupRole | null;
}

/** A member of a group (GET /groups/:id/members). */
export interface GroupMember {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: GroupRole;
  joinedAt: string;
}

/** Preview of a group by join code (GET /groups/preview/:code). */
export interface GroupPreview {
  id: string;
  name: string;
  currency: string;
  memberCount: number;
  adminName: string | null;
  alreadyMember: boolean;
}

/** A currency entry from currencies.json. */
export interface Currency {
  code: string;
  name: string;
  namePlural: string;
  symbol: string;
  symbolNative: string;
  decimalDigits: number;
  rounding: number;
}
