import { useState } from "react";
import { Settings2 } from "lucide-react";
import type { Category } from "../types";
import CategoryManagementModal from "./CategoryManagementModal";

export type DateRangeKey = "all" | "today" | "week" | "month" | "custom";

export interface DateRange {
  key: DateRangeKey;
  startDate?: string;
  endDate?: string;
}

interface ExpenseFiltersProps {
  categories: Category[];
  selectedCategoryId: string; // "" = all
  onSelectCategory: (id: string) => void;
  range: DateRange;
  onChangeRange: (range: DateRange) => void;
}

const RANGE_CHIPS: { key: DateRangeKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

/**
 * Pill-based filters for the Expenses page: scrollable category pills (styled
 * to match the Home categories bar) and a compact date-range chip set. The
 * "Custom" chip reveals start/end date pickers. Includes a "manage categories"
 * entry point that opens the shared modal.
 */
export default function ExpenseFilters({
  categories,
  selectedCategoryId,
  onSelectCategory,
  range,
  onChangeRange,
}: ExpenseFiltersProps) {
  const [managing, setManaging] = useState(false);

  const selectRangeKey = (key: DateRangeKey) => {
    if (key === "custom") {
      onChangeRange({ key: "custom", ...computeRange("custom", range) });
    } else {
      onChangeRange({ key, ...computeRange(key) });
    }
  };

  return (
    <div className="space-y-3">
      {/* Category pills */}
      <div>
        <div className="flex w-full gap-1.5">
          <button
            type="button"
            onClick={() => setManaging(true)}
            aria-label="Manage categories"
            title="Manage categories"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#1f1f1f] text-gray-300 ring-1 ring-gray-200"
          >
            <Settings2 size={16} />
          </button>

          <div className="flex grow min-w-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            <Pill
              active={selectedCategoryId === ""}
              onClick={() => onSelectCategory("")}
            >
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
          </div>
        </div>
      </div>

      {/* Date range chips */}
      <div className="flex flex-wrap gap-1.5">
        {RANGE_CHIPS.map((chip) => (
          <Pill
            key={chip.key}
            active={range.key === chip.key}
            onClick={() => selectRangeKey(chip.key)}
          >
            {chip.label}
          </Pill>
        ))}
      </div>

      {/* Custom range pickers */}
      {range.key === "custom" && (
        <div className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
          <input
            type="date"
            value={range.startDate ?? ""}
            max={range.endDate}
            onChange={(e) =>
              onChangeRange({ ...range, key: "custom", startDate: e.target.value })
            }
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={range.endDate ?? ""}
            min={range.startDate}
            onChange={(e) =>
              onChangeRange({ ...range, key: "custom", endDate: e.target.value })
            }
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>
      )}

      <CategoryManagementModal
        open={managing}
        onClose={() => setManaging(false)}
      />
    </div>
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
      className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium shadow-sm shadow-black/5 transition-transform active:scale-95"
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
