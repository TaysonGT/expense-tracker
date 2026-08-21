import type { Category } from "../types";
import CategoryStrip from "./CategoryStrip";

export type DateRangeKey = "all" | "today" | "week" | "month" | "custom";

export interface DateRange {
  key: DateRangeKey;
  startDate?: string;
  endDate?: string;
}

interface ExpenseFiltersProps {
  categories: Category[];
  /** Show skeleton chips while the categories query is in flight. */
  categoriesLoading?: boolean;
  selectedCategoryId: string; // "" = all
  onSelectCategory: (id: string) => void;
}

/**
 * Category pills for the Expenses page (scrollable strip to match Home's
 * categories bar). Date filtering moved into DateFilterModal accessed from the
 * page header. Includes a "manage categories" entry point that opens the shared
 * modal.
 */
export default function ExpenseFilters({
  categories,
  categoriesLoading = false,
  selectedCategoryId,
  onSelectCategory,
}: ExpenseFiltersProps) {
  return (
    <CategoryStrip isLoading={categoriesLoading} className="pe-4">
      <Pill active={selectedCategoryId === ""} onClick={() => onSelectCategory("")}>
        All
      </Pill>
      {categories.map((c) => (
        <Pill
          key={c.id}
          active={selectedCategoryId === c.id}
          onClick={() => onSelectCategory(c.id)}
        >
          {c.name}
        </Pill>
      ))}
    </CategoryStrip>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full px-4 py-2 text-sm font-medium shadow-sm shadow-black/5 transition-transform active:scale-95"
      style={
        active
          ? { background: "#111827", color: "#ffffff", border: "1px solid #111827" }
          : { background: "#ffffff", color: "#374151", border: "1px solid #d3d3d3" }
      }
    >
      {children}
    </button>
  );
}

/* ----------------------------- range helpers ----------------------------- */

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Resolves a preset range key into concrete start/end dates. For "custom" we
 * preserve any previously chosen dates.
 */
export function computeRange(
  key: DateRangeKey,
  previous?: DateRange
): { startDate?: string; endDate?: string } {
  const now = new Date();
  const today = iso(now);

  switch (key) {
    case "all":
      return {};
    case "today":
      return { startDate: today, endDate: today };
    case "week": {
      // Week starting Monday.
      const day = (now.getDay() + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - day);
      return { startDate: iso(monday), endDate: today };
    }
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: iso(first), endDate: today };
    }
    case "custom":
      return {
        startDate: previous?.startDate,
        endDate: previous?.endDate,
      };
  }
}
