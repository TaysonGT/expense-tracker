import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, FilterX } from "lucide-react";
import { useCategories, useExpenses } from "../lib/queries";

/**
 * Expenses screen (read-only list).
 *
 * Shows the full expense list, filterable by category and by a single day.
 * Pending items (cost may be null) are listed with a "pending" badge — editing
 * them happens in the Approval Queue, a separate not-yet-built screen.
 */
export default function Expenses() {
  const nav = useNavigate();
  const { data: categories = [] } = useCategories();

  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState("");

  // Single-day filter → startDate = endDate. Empty strings mean "no filter".
  const { data: expenses = [], isLoading, isError, refetch } = useExpenses({
    categoryId: categoryId || undefined,
    startDate: date || undefined,
    endDate: date || undefined,
  });

  const hasFilters = Boolean(categoryId) || Boolean(date);

  const clearFilters = () => {
    setCategoryId("");
    setDate("");
  };

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
        {/* Filter controls */}
        <div className="mt-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="flex gap-3">
            <label className="block flex-1">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Category
              </span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block flex-1">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
              />
            </label>
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"
            >
              <FilterX size={13} />
              Clear filters
            </button>
          )}
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

        {/* List */}
        {!isLoading && !isError && (
          <section className="mt-6">
            {expenses.length === 0 ? (
              <p className="rounded-xl bg-white p-4 text-center text-sm text-gray-400 ring-1 ring-gray-100">
                {hasFilters ? "No expenses match these filters." : "No expenses yet."}
              </p>
            ) : (
              <ul className="space-y-2">
                {expenses.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between rounded-xl bg-white p-4 text-sm ring-1 ring-gray-100"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium text-gray-900">
                        {e.title}
                      </span>
                      <span className="text-xs text-gray-400">
                        {e.category?.name ?? "Uncategorized"} · {e.date}
                      </span>
                    </div>
                    {e.cost != null ? (
                      <span className="mono flex-shrink-0 font-medium text-gray-900">
                        ${e.cost.toFixed(2)}
                      </span>
                    ) : (
                      <span
                        className="flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
                        style={{
                          background: "rgba(245,158,11,0.15)",
                          color: "#b45309",
                        }}
                      >
                        Pending
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
