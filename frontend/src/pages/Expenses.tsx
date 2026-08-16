import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useCategories, useExpenses } from "../lib/queries";
import ExpenseFilters, {
  computeRange,
  type DateRange,
} from "../components/ExpenseFilters";
import ExpenseInsights from "../components/ExpenseInsights";
import ExpenseListItem from "../components/ExpenseListItem";

/**
 * Expenses screen.
 *
 * Pill-based filters (category + date range) drive a TanStack Query fetch. An
 * insights block (summary strip, category breakdown, per-day chart) is computed
 * client-side from the filtered result and reacts live to filter changes. Each
 * list item is inline-editable via the general PATCH /expenses/:id endpoint.
 */
export default function Expenses() {
  const nav = useNavigate();
  const { data: categories = [] } = useCategories();

  const [categoryId, setCategoryId] = useState("");
  const [range, setRange] = useState<DateRange>(() => ({
    key: "all",
    ...computeRange("all"),
  }));

  const filters = useMemo(
    () => ({
      categoryId: categoryId || undefined,
      startDate: range.startDate || undefined,
      endDate: range.endDate || undefined,
    }),
    [categoryId, range.startDate, range.endDate]
  );

  const { data: expenses = [], isLoading, isError, refetch } =
    useExpenses(filters);

  const hasFilters =
    Boolean(categoryId) || range.key !== "all";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <button
          onClick={() => nav(-1)}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-gray-100"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold">Expenses</h1>
      </header>

      <main className="mx-auto max-w-md px-4 pb-28">
        {/* Filters */}
        <div className="mt-2">
          <ExpenseFilters
            categories={categories}
            selectedCategoryId={categoryId}
            onSelectCategory={setCategoryId}
            range={range}
            onChangeRange={setRange}
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="mt-16 flex flex-col items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
            <p className="mt-4 text-sm text-gray-400">Loading expenses…</p>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="mt-16 flex flex-col items-center">
            <p className="text-sm font-medium text-gray-800">
              Couldn't load expenses.
            </p>
            <button
              onClick={() => void refetch()}
              className="mt-4 rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {/* Content */}
        {!isLoading && !isError && (
          <>
            {/* Insights — reacts live to filters, computed client-side */}
            <ExpenseInsights
              expenses={expenses}
              startDate={range.startDate}
              endDate={range.endDate}
            />

            {/* List */}
            <section className="mt-6">
              {expenses.length === 0 ? (
                <p className="rounded-xl bg-white p-4 text-center text-sm text-gray-400 ring-1 ring-gray-100">
                  {hasFilters
                    ? "No expenses match these filters."
                    : "No expenses yet."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {expenses.map((e) => (
                    <ExpenseListItem
                      key={e.id}
                      expense={e}
                      categories={categories}
                    />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
