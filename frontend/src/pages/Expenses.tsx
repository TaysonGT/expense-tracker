import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Clock, ChevronRight, Calendar } from "lucide-react";
import { useCategories, useExpenses, usePendingExpenses } from "../lib/queries";
import ExpenseFilters from "../components/ExpenseFilters";
import { computeRange, type DateRange } from "../components/ExpenseFilters";
import DateFilterModal from "../components/DateFilterModal";
import ExpenseInsights from "../components/ExpenseInsights";
import ExpenseListItem from "../components/ExpenseListItem";
import GroupSelector from "../components/GroupSelector";
import { useAuth } from "../context/AuthContext";

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
 * Category pills (inline) drive a TanStack Query fetch. Date filtering moves
 * into a modal opened from the header — which also displays today's day of
 * week and date. An insights block (summary strip, category breakdown, per-day
 * chart) is computed client-side from the filtered result and reacts live to
 * filter changes. Each list item is inline-editable via PATCH /expenses/:id.
 */
const RANGE_LABELS: Record<DateRange["key"], string> = {
  all: "All",
  today: "Today",
  week: "This Week",
  month: "This Month",
  custom: "Custom",
};

function formatToday(d: Date): string {
  const weekday = d.toLocaleString("en-US", { weekday: "long" });
  const month = d.toLocaleString("en-US", { month: "long" });
  const day = d.getDate();
  return `${weekday}, ${month} ${day}`;
}

export default function Expenses() {
  const nav = useNavigate();
  const { currentGroup } = useAuth();
  const currencyCode = currentGroup?.currency;
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();

  const [categoryId, setCategoryId] = useState("");
  const [range, setRange] = useState<DateRange>(() => ({
    key: "all",
    ...computeRange("all"),
  }));
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  const today = useMemo(() => formatToday(new Date()), []);
  const rangeKeyLabel = RANGE_LABELS[range.key];
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
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav(-1)}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-gray-100"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold">Expenses</h1>
        </div>
        <GroupSelector dir="left" />
      </header>

       <main className="mx-auto max-w-md px-4 pb-28">
        {/* Today's date + date filter button */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={18} className="text-gray-400" />
            <span className="font-medium text-gray-500">
              {today}
            </span>
          </div>
          <button
            onClick={() => setDateFilterOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
          >
            <Calendar size={14} className="text-gray-400" />
            {rangeKeyLabel}
          </button>
        </div>

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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
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

        <ExpenseInsights
          expenses={expenses}
          startDate={range.startDate}
          endDate={range.endDate}
          currencyCode={currencyCode}
          isLoading={isLoading}
        />

        {/* Category pills */}
        <div className="mt-4">
          <ExpenseFilters
            categories={categories}
            categoriesLoading={categoriesLoading}
            selectedCategoryId={categoryId}
            onSelectCategory={setCategoryId}
          />
        </div>

        {/* Date range filter modal */}
        <DateFilterModal
          open={dateFilterOpen}
          onClose={() => setDateFilterOpen(false)}
          range={range}
          onChangeRange={setRange}
        />

        {/* Loading: skeleton animations for insights + list */}
        {isLoading && (
          <div className="mt-4 space-y-3">
            {/* Summary strip skeletons */}
            {/* <div className="grid grid-cols-3 gap-2"> */}
            {/*   <Skeleton className="h-14 rounded-2xl" /> */}
            {/*   <Skeleton className="h-14 rounded-2xl" /> */}
            {/*   <Skeleton className="h-14 rounded-2xl" /> */}
            {/* </div> */}
            {/* Category breakdown skeleton */}
            {/* <Skeleton className="h-44 rounded-2xl" /> */}
            {/* Spend-per-day skeleton */}
            {/* <Skeleton className="h-36 rounded-2xl" /> */}
            
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
            {/* List */}
            <section className="mt-2">
              {expenses.length === 0 ? (
                <p className="rounded-xl bg-white p-4 text-center text-sm text-gray-400 ring-1 ring-gray-100">
                  {hasFilters
                    ? "No expenses match these filters."
                    : "No expenses yet."}
                </p>
              ) : (
                <ul className="space-y-1">
                  {expenses.map((e) => (
                    <ExpenseListItem
                      key={e.id}
                      expense={e}
                      categories={categories}
                      currencyCode={currencyCode}
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
