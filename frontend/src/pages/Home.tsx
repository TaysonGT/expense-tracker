import { useMemo } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, ChevronsRight, Clock, Mic, PenLine } from "lucide-react";
import { useCategories, useExpenses, usePendingExpenses } from "../lib/queries";
import type { Category, Expense } from "../types";
import CategoryScroller from "../components/CategoryScroller";
import GroupSelector from "../components/GroupSelector";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../lib/expenseFormat";
import ExpenseListItem from "../components/ExpenseListItem";

/**
 * Home screen.
 *
 * Renders as one of three distinct states rather than a single layout:
 *  - Loading   → skeleton placeholders shaped like the populated layout
 *  - Empty     → greeting + warm voice-capture CTA + categories
 *  - Populated → greeting + total-spend box (with vs-yesterday trend) +
 *                categories + optional pending nudge + recent expenses
 */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function sumCost(expenses: Expense[]): number {
  return expenses.reduce((total, e) => total + (e.cost ?? 0), 0);
}

export default function Home() {
  const nav = useNavigate();
  const { currentGroup } = useAuth();
  const currencyCode = currentGroup?.currency;
  const today = todayIso();
  const yesterday = isoDaysAgo(1);

  const todayQuery = useExpenses({
    startDate: today,
    endDate: today,
    pending: false,
  });
  const yesterdayQuery = useExpenses({
    startDate: yesterday,
    endDate: yesterday,
    pending: false,
  });
  const recentQuery = useExpenses({ pending: false });
  const pendingQuery = usePendingExpenses();

  const todayExpenses = todayQuery.data ?? [];
  const totalToday = useMemo(() => sumCost(todayExpenses), [todayExpenses]);
  const totalYesterday = useMemo(
    () => sumCost(yesterdayQuery.data ?? []),
    [yesterdayQuery.data]
  );

  const approvedCount = todayExpenses.length;
  const pendingCount = pendingQuery.data?.length ?? 0;
  const recentExpenses = (recentQuery.data ?? []).slice(0, 5);

  const { data: categories = [] } =
    useCategories();

  // Loading while today's data (the state discriminator) hasn't arrived.
  const loading = todayQuery.isLoading || pendingQuery.isLoading;

  return (
    <div className="min-h-full bg-gray-50 text-gray-900 h-full flex flex-col items-center">
      <main className="max-w-md w-full px-4 py-4 grow overflow-y-hidden">
        {loading ? (
          <HomeSkeleton />
        ) : (
          <div className="flex h-full flex-col">
            {/* Header: greeting + group selector */}
              <div className="flex w-full justify-between items-center">
                <img src="/default-monochrome.svg" className="h-7"/>
                <GroupSelector dir="left" />
              </div>

            {/* Total-spend box — always present, even when empty */}
            <TotalSpendBox
              totalToday={totalToday}
              totalYesterday={totalYesterday}
              approvedCount={approvedCount}
              currencyCode={currencyCode}
            />

            {/* Bottom section: empty vs. populated list */}
            {recentExpenses.length === 0 ? (
              <EmptyState
                onRecord={() => nav("/voice")}
                onManual={() => nav("/manual")}
              />
            ) : (
              <PopulatedState
                recentExpenses={recentExpenses}
                pendingCount={pendingCount}
                categories={categories}
                onReview={() => nav("/pending")}
                onViewAll={() => nav("/expenses")}
                currencyCode={currencyCode}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* -------------------------------- Loading -------------------------------- */

function HomeSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-7 w-40 rounded-lg bg-gray-200" />
        <div className="h-8 w-32 rounded-xl bg-gray-200" />
      </div>

      {/* Total box */}
      <div className="mt-5 h-40 rounded-3xl bg-gray-200" />

      {/* Categories */}
      <div className="mt-6 h-4 w-24 rounded bg-gray-200" />
      <div className="mt-3 flex gap-2.5">
        <div className="h-9 w-24 rounded-full bg-gray-200" />
        <div className="h-9 w-20 rounded-full bg-gray-200" />
        <div className="h-9 w-28 rounded-full bg-gray-200" />
      </div>

      {/* Recent list */}
      <div className="mt-8 h-5 w-20 rounded bg-gray-200" />
      <div className="mt-3 space-y-2">
        <div className="h-16 rounded-xl bg-gray-200" />
        <div className="h-16 rounded-xl bg-gray-200" />
        <div className="h-16 rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}

/* --------------------------------- Empty --------------------------------- */

function EmptyState({
  onRecord,
  onManual,
}: {
  onRecord: () => void;
  onManual: () => void;
}) {
  return (
    <div className="mt-6 grow">
      <hr className=" border-t border-[#d3d3d3] mb-4 w-7/10 mx-auto"/>
      <div className="flex h-full flex-col items-center gap-5 text-center">
        <p className="text-sm text-gray-400">
          No expenses recorded yet — pick a method above to get started.
        </p>
        {/* Two attractive input-method choices */}
        <div className="flex flex-col items-center gap-4">
          <InputMethodChoice
            icon={<PenLine size={22} />}
            title="Type it"
            subtitle="Enter the details manually"
            accent="#00c48c"
            onClick={onManual}
          />
          <InputMethodChoice
            icon={<Mic size={26} />}
            title="Speak it"
            subtitle="Tap and narrate your expense"
            accent="#111827"
            onClick={onRecord}
          />
        </div>

      </div>
    </div>
  );
}

function InputMethodChoice({
  icon,
  title,
  subtitle,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 rounded-2xl px-6 py-4 text-left border transition-all duration-150 hover:shadow-md hover:shadow-black/20 active:scale-[0.98] shadow-sm shadow-black/35 text-white"
      style={{ backgroundColor: accent }}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{ background: "white", color: accent }}
      >
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="text-xs text-gray-100">{subtitle}</span>
      </span>
    </button>
  );
}

/* ----------------------------- Total Spend Box ---------------------------- */

function TotalSpendBox({
  totalToday,
  totalYesterday,
  approvedCount,
  currencyCode,
}: {
  totalToday: number;
  totalYesterday: number;
  approvedCount: number;
  currencyCode?: string;
}) {
  return (
    <div className="mt-5">
      <div
        className="relative overflow-hidden rounded-3xl p-6"
        style={{ background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)" }}
      >
        <div
          className="absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-10"
          style={{ border: "40px solid white" }}
        />
        <div
          className="absolute -right-4 -bottom-16 h-40 w-40 rounded-full opacity-5"
          style={{ border: "30px solid white" }}
        />

        <p
          className="text-xs font-medium uppercase tracking-widest text-gray-400"
          style={{ letterSpacing: "0.12em" }}
        >
          Spent today
        </p>
        <div className="mt-2 flex items-end gap-2">
          <span
            className="text-5xl font-light text-white"
            style={{
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "-0.02em",
            }}
          >
            {formatCurrency(totalToday, currencyCode)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-gray-400">
            {approvedCount} {approvedCount === 1 ? "expense" : "expenses"} logged
          </p>
          <TrendPill today={totalToday} yesterday={totalYesterday} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Populated ------------------------------- */

function PopulatedState({
  recentExpenses,
  pendingCount,
  onReview,
  onViewAll,
  currencyCode,
  categories,
}: {
  recentExpenses: Expense[];
  pendingCount: number;
  onReview: () => void;
  onViewAll: () => void;
  currencyCode?: string;
  categories: Category[];
}) {
  return (
    <div className="mt-2 flex flex-col grow overflow-y-auto">
      {/* Pending nudge — conversational, only when items exist */}
      {pendingCount > 0 && (
        <button
          onClick={onReview}
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
                ? "1 item needs a quick review"
                : `${pendingCount} items need a quick review`}
            </span>
            <span className="text-xs" style={{ color: "#d97706" }}>
              Tap to confirm and file them
            </span>
          </span>
          <ArrowRight size={18} className="ml-auto" style={{ color: "#d97706" }} />
        </button>
      )}

      {/* Categories */}
      <CategoryScroller />

      {/* Recent expenses */}
      <section className="mt-4 grow pb-12 flex flex-col min-h-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent</h2>
          <button
            onClick={onViewAll}
            className="text-sm font-medium text-blue-600 flex items-center gap-1"
          >
            View all
            <ChevronsRight size={20}/>
          </button>
        </div>
        <ul className="mt-3 space-y-1 grow min-h-0 overflow-y-auto pb-10">
          {recentExpenses.map((e) => (
            <ExpenseListItem
              key={e.id}
              expense={e}
              categories={categories}
              currencyCode={currencyCode}
            />
            // <li
            //   key={e.id}
            //   className="flex items-center justify-between rounded-xl bg-white p-4 text-sm border border-[#e6e6e6]"
            // >
            //   <div className="flex min-w-0 flex-col">
            //     <span className="truncate font-medium text-gray-900">
            //       {e.title}
            //     </span>
            //     <span className="text-xs text-gray-400">
            //       {e.category?.name ?? "Uncategorized"} · {e.date}
            //     </span>
            //   </div>
            //   <span className="mono shrink-0 font-medium text-gray-900">
            //     {e.cost != null ? formatCurrency(e.cost, currencyCode) : "—"}
            //   </span>
            // </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * Small trend indicator comparing today's total against yesterday's.
 * Hidden when there's no yesterday baseline to compare against.
 */
function TrendPill({ today, yesterday }: { today: number; yesterday: number }) {
  if (yesterday <= 0) return null;

  const diff = today - yesterday;
  const pct = Math.round((diff / yesterday) * 100);
  const up = diff > 0;
  const flat = diff === 0;

  const color = flat ? "#9ca3af" : up ? "#34d399" : "#f87171";
  const label = flat
    ? "same as yesterday"
    : `${up ? "▲" : "▼"} ${Math.abs(pct)}% vs yesterday`;

  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: "rgba(255,255,255,0.08)", color }}
    >
      {label}
    </span>
  );
}
