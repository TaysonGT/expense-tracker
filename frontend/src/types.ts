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
