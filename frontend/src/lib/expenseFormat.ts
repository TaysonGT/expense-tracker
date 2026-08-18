import currencies from "../data/currencies.json";
import type { Currency } from "../types";

/**
 * Small presentational helpers shared by the Expenses page and its pieces.
 */

// A stable, pleasant palette. Category color is derived from its id so the
// same category always gets the same swatch without needing a DB column.
const PALETTE = [
  "#00c48c",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

export function colorForCategory(id: string | null | undefined): string {
  if (!id) return "#9ca3af"; // uncategorized → gray
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/**
 * Look up a Currency object from currencies.json by ISO code (e.g. "EUR").
 * Falls back to USD when the code isn't found.
 */
const CURRENCY_MAP = new Map(
  (currencies as Currency[]).map((c) => [c.code.toUpperCase(), c])
);

export function getCurrency(code?: string | null): Currency {
  if (code) {
    const found = CURRENCY_MAP.get(code.toUpperCase());
    if (found) return found;
  }
  // Default to USD.
  return CURRENCY_MAP.get("USD")!;
}

/**
 * Format a number as a currency string using the group's currency.
 * Defaults to USD when no currency is provided.
 */
export function formatCurrency(value: number, currencyCode?: string): string {
  const currency = getCurrency(currencyCode);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: currency.decimalDigits,
    maximumFractionDigits: currency.decimalDigits,
  }).format(value);
}

/**
 * Return the native symbol for a currency code (e.g. "€" for EUR).
 * Used for input field prefixes where we want the symbol, not a full
 * formatted amount.
 */
export function currencySymbol(currencyCode?: string): string {
  return getCurrency(currencyCode).symbolNative;
}

/**
 * Relative date label: "Today", "Yesterday", else a compact date.
 * Input is a yyyy-mm-dd string.
 */
export function formatRelativeDate(iso: string): string {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayIso = yesterday.toISOString().slice(0, 10);

  if (iso === todayIso) return "Today";
  if (iso === yesterdayIso) return "Yesterday";

  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

/** Inclusive count of days between two yyyy-mm-dd strings. */
export function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00`).getTime();
  const end = new Date(`${endIso}T00:00:00`).getTime();
  return Math.round((end - start) / 86_400_000) + 1;
}
