import { useMemo } from "react";
import type { Expense } from "../types";
import {
  colorForCategory,
  daysBetween,
  formatCurrency,
} from "../lib/expenseFormat";

interface ExpenseInsightsProps {
  expenses: Expense[];
  /** Active date range (yyyy-mm-dd), used to decide the per-day chart. */
  startDate?: string;
  endDate?: string;
  /** ISO currency code (e.g. "EUR") for formatting money values. */
  currencyCode?: string;
  categoryRatio?: boolean;
  spendPerDay?: boolean;
  isLoading?: boolean
}

// Only render the per-day chart for reasonably small ranges.
const MAX_DAYS_FOR_DAILY_CHART = 31;

/**
 * Insights block shown above the expense list. All figures are computed
 * client-side from the already-fetched (filtered) list, so it reacts live to
 * filter changes with no extra network calls.
 *
 * Only counted expenses have a cost; pending items with null cost are excluded
 * from money math but still counted where sensible.
 */
export default function ExpenseInsights({
  expenses,
  startDate,
  endDate,
  currencyCode,
  categoryRatio,
  spendPerDay,
  isLoading
}: ExpenseInsightsProps) {
  const stats = useMemo(() => computeStats(expenses), [expenses]);

  const dailyChart = useMemo(() => {
    if (!startDate || !endDate) return null;
    const span = daysBetween(startDate, endDate);
    if (span < 1 || span > MAX_DAYS_FOR_DAILY_CHART) return null;
    return buildDailySeries(expenses, startDate, span);
  }, [expenses, startDate, endDate]);

  // if (expenses.length === 0) return null;

  return (
    <section className="mt-4 space-y-3">
      {/* Summary strip */}
      {isLoading?
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-18 rounded-2xl" />
          <Skeleton className="h-18 rounded-2xl" />
          {/* <Skeleton className="h-18 rounded-2xl" /> */}
        </div>
        :
        <div className="grid grid-cols-2 gap-2">
          <SummaryCell label="Total" value={formatCurrency(stats.total, currencyCode)} />
          <SummaryCell label="Expenses" value={String(stats.count)} />
          {/* <SummaryCell label="Average" value={formatCurrency(stats.average, currencyCode)} /> */}
        </div>
      }

      {/* Category breakdown */}
      {categoryRatio&& (stats.byCategory.length > 0 && stats.total > 0) && (
        <div className="rounded-2xl bg-card p-4 shadow-sm border border-border">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-empty-title">
            By category
          </h3>

          {/* Proportional stacked bar */}
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            {stats.byCategory.map((c) => (
              <div
                key={c.id ?? "none"}
                style={{
                  width: `${(c.total / stats.total) * 100}%`,
                  background: colorForCategory(c.id),
                }}
                 title={`${c.name}: ${formatCurrency(c.total, currencyCode)}`}
              />
            ))}
          </div>

          {/* Legend */}
          <ul className="mt-3 space-y-1.5">
            {stats.byCategory.map((c) => (
              <li
                key={c.id ?? "none"}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: colorForCategory(c.id) }}
                />
                <span className="min-w-0 flex-1 truncate text-empty-subtitle">
                  {c.name}
                </span>
                <span className="text-xs text-empty-title">
                  {Math.round((c.total / stats.total) * 100)}%
                </span>
                <span className="mono w-16 text-right font-medium text-primary">
                   {formatCurrency(c.total, currencyCode)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Spend per day */}
      {spendPerDay&&(dailyChart && dailyChart.max > 0) && (
        <div className="rounded-2xl bg-card p-4 shadow-sm border border-border">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-empty-title">
            Spend per day
          </h3>
          <div className="flex h-24 items-end gap-1">
            {dailyChart.series.map((d) => (
              <div
                key={d.date}
                className="flex flex-1 flex-col items-center gap-1"
                 title={`${d.date}: ${formatCurrency(d.total, currencyCode)}`}
              >
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(2, (d.total / dailyChart.max) * 100)}%`,
                    background: d.total > 0 ? "#111827" : "#e5e7eb",
                    minHeight: 2,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-empty-title">
            <span>{dailyChart.series[0]?.label}</span>
            <span>{dailyChart.series[dailyChart.series.length - 1]?.label}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-accent-dark p-3 text-center shadow-xs shadow-black/25 border-2 border-border-light">
      <div className="font-[Oswald] text-2xl font-semibold text-white">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-white">
        {label}
      </div>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-skeleton ${className}`}
      aria-hidden
    />
  );
}

/* --------------------------------- math ---------------------------------- */

interface CategoryTotal {
  id: string | null;
  name: string;
  total: number;
}

interface Stats {
  total: number;
  count: number;
  average: number;
  byCategory: CategoryTotal[];
}

function computeStats(expenses: Expense[]): Stats {
  let total = 0;
  let costedCount = 0;
  const catMap = new Map<string, CategoryTotal>();

  for (const e of expenses) {
    if (e.cost != null) {
      total += e.cost;
      costedCount += 1;

      const key = e.categoryId ?? "none";
      const existing = catMap.get(key);
      if (existing) {
        existing.total += e.cost;
      } else {
        catMap.set(key, {
          id: e.categoryId,
          name: e.category?.name ?? "Uncategorized",
          total: e.cost,
        });
      }
    }
  }

  const byCategory = [...catMap.values()].sort((a, b) => b.total - a.total);

  return {
    total,
    count: expenses.length,
    average: costedCount > 0 ? total / costedCount : 0,
    byCategory,
  };
}

interface DailyPoint {
  date: string;
  label: string;
  total: number;
}

function buildDailySeries(
  expenses: Expense[],
  startIso: string,
  span: number
): { series: DailyPoint[]; max: number } {
  const totals = new Map<string, number>();
  for (const e of expenses) {
    if (e.cost != null) {
      totals.set(e.date, (totals.get(e.date) ?? 0) + e.cost);
    }
  }

  const series: DailyPoint[] = [];
  const start = new Date(`${startIso}T00:00:00`);
  let max = 0;

  for (let i = 0; i < span; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const total = totals.get(iso) ?? 0;
    if (total > max) max = total;
    series.push({
      date: iso,
      label: d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      total,
    });
  }

  return { series, max };
}
