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

export function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
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
