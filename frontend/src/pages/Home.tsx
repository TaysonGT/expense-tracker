import { useMemo } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Mic } from "lucide-react";
import { useExpenses, usePendingExpenses } from "../lib/queries";
import type { Expense } from "../types";
import CategoryScroller from "../components/CategoryScroller";

/**
 * Home screen.
 *
 * Renders as one of three distinct states rather than a single layout:
 *  - Loading   → skeleton placeholders shaped like the populated layout
 *  - Empty     → greeting + warm voice-capture CTA + categories
 *  - Populated → greeting + total-spend box (with vs-yesterday trend) +
 *                categories + optional pending nudge + recent expenses
 */

// No auth/user endpoint in v1 — the greeting name is a placeholder for now.
const USER_NAME = "Mohamed";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function greetingForNow(name: string): string {
  const hour = new Date().getHours();
  const part =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${name}`;
}

function sumCost(expenses: Expense[]): number {
  return expenses.reduce((total, e) => total + (e.cost ?? 0), 0);
}

export default function Home() {
  const nav = useNavigate();
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

  // Loading while today's data (the state discriminator) hasn't arrived.
  const loading = todayQuery.isLoading || pendingQuery.isLoading;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="mx-auto max-w-md px-4 py-8">
        {loading ? (
          <HomeSkeleton />
        ) : approvedCount === 0 ? (
          <EmptyState
            name={USER_NAME}
            onRecord={() => nav("/voice")}
          />
        ) : (
          <PopulatedState
            name={USER_NAME}
            totalToday={totalToday}
            totalYesterday={totalYesterday}
            approvedCount={approvedCount}
            pendingCount={pendingCount}
            recentExpenses={recentExpenses}
            onReview={() => nav("/voice")}
            onViewAll={() => nav("/expenses")}
          />
        )}
      </main>
    </div>
  );
}

/* -------------------------------- Loading -------------------------------- */

function HomeSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Greeting */}
      <div className="h-7 w-52 rounded-lg bg-gray-200" />
      <div className="mt-2 h-4 w-36 rounded bg-gray-200" />

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
  name,
  onRecord,
}: {
  name: string;
  onRecord: () => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{greetingForNow(name)}</h1>

      <div className="mt-10 flex flex-col items-center text-center">
        <button
          onClick={onRecord}
          aria-label="Record a voice expense"
          className="relative flex h-24 w-24 items-center justify-center rounded-full text-white transition-transform active:scale-95"
          style={{
            background: "#111827",
            boxShadow: "0 8px 30px rgba(17,24,39,0.35)",
          }}
        >
          <Mic size={34} />
        </button>
        <p className="mt-6 text-base font-medium text-gray-800">
          No expenses yet today
        </p>
        <p className="mt-1 max-w-xs text-sm text-gray-500">
          Tap the mic and just say what you bought — we'll sort out the details.
        </p>
      </div>

      {/* Categories are not tied to "today" — shown here too. */}
      <CategoryScroller />
    </div>
  );
}

/* ------------------------------- Populated ------------------------------- */

function PopulatedState({
  name,
  totalToday,
  totalYesterday,
  approvedCount,
  pendingCount,
  recentExpenses,
  onReview,
  onViewAll,
}: {
  name: string;
  totalToday: number;
  totalYesterday: number;
  approvedCount: number;
  pendingCount: number;
  recentExpenses: Expense[];
  onReview: () => void;
  onViewAll: () => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{greetingForNow(name)}</h1>
      <p className="mt-1 text-sm text-gray-500">
        Here's your spending at a glance.
      </p>

      {/* Total Spend Card */}
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
              style={{ fontFamily: "'DM Mono', monospace", letterSpacing: "-0.02em" }}
            >
              ${totalToday.toFixed(2)}
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

      {/* Categories directly below the total box */}
      <CategoryScroller />

      {/* Pending nudge — conversational, only when items exist */}
      {pendingCount > 0 && (
        <button
          onClick={onReview}
          className="mt-6 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-opacity hover:opacity-90"
          style={{
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            style={{ background: "rgba(245,158,11,0.25)", color: "#b45309" }}
          >
            {pendingCount}
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold" style={{ color: "#b45309" }}>
              {pendingCount === 1
                ? "1 item needs a quick review"
                : `${pendingCount} items need a quick review`}
            </span>
            <span className="text-xs" style={{ color: "#d97706" }}>
              Tap to confirm and file them
            </span>
          </span>
          <span className="ml-auto text-lg" style={{ color: "#d97706" }}>
            <ArrowRightCircleIcon/>
          </span>
        </button>
      )}

      {/* Recent expenses */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent</h2>
          <button
            onClick={onViewAll}
            className="text-sm font-medium text-blue-600"
          >
            View all
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {recentExpenses.map((e) => (
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
              <span className="mono flex-shrink-0 font-medium text-gray-900">
                {e.cost != null ? `$${e.cost.toFixed(2)}` : "—"}
              </span>
            </li>
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

  const color = flat ? "#9ca3af" : up ? "#f87171" : "#34d399";
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
