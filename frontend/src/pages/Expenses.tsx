import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Clock, ChevronRight } from "lucide-react";
import { useCategories, useExpenses, usePendingExpenses } from "../lib/queries";
import ExpenseFilters, {
  computeRange,
  type DateRange,
} from "../components/ExpenseFilters";
import ExpenseInsights from "../components/ExpenseInsights";
import ExpenseListItem from "../components/ExpenseListItem";

/** A shimmering gray block used as a loading placeholder. */
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 ${className}`}
      aria-hidden
    />
  );
}

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
      pending: false, // pending items live on the dedicated /pending page
    }),
    [categoryId, range.startDate, range.endDate]
  );

  const { data: expenses = [], isLoading, isError, refetch } =
    useExpenses(filters);

  const { data: pending = [] } = usePendingExpenses();
  const pendingCount = pending.length;

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
        {/* Pending review entry point */}
        {pendingCount > 0 && (
          <button
            onClick={() => nav("/pending")}
            className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-opacity hover:opacity-90 cursor-pointer"
            style={{
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(245,158,11,0.25)", color: "#b45309" }}
            >
              <Clock size={18} />
            </span>
            <span className="flex flex-col">
              <span
                className="text-sm font-semibold"
                style={{ color: "#b45309" }}
              >
                {pendingCount === 1
                  ? "1 item pending review"
                  : `${pendingCount} items pending review`}
              </span>
              <span className="text-xs" style={{ color: "#d97706" }}>
                Tap to confirm and file them
              </span>
            </span>
            <ChevronRight size={18} className="ml-auto" style={{ color: "#d97706" }} />
          </button>
        )}

        {/* Filters */}
        <div className="mt-4">
          <ExpenseFilters
            categories={categories}
            selectedCategoryId={categoryId}
            onSelectCategory={setCategoryId}
            range={range}
            onChangeRange={setRange}
          />
        </div>

        {/* Loading: skeleton animations for insights + list */}
        {isLoading && (
          <div className="mt-4 space-y-3">
            {/* Summary strip skeletons */}
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
            </div>
            {/* Category breakdown skeleton */}
            <Skeleton className="h-44 rounded-2xl" />
            {/* Spend-per-day skeleton */}
            <Skeleton className="h-36 rounded-2xl" />
            {/* List item skeletons */}
            <div className="mt-6 space-y-2 pt-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
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
