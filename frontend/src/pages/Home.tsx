import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useExpenses, usePendingExpenses } from "../lib/queries";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Home screen.
 *
 * Shows a greeting, today's total spend + expense count in a prominent box
 * with a pending-items entry point, and a list of recent (non-pending)
 * expenses with a "View all" link to the Expenses page.
 */
export default function Home() {
  const nav = useNavigate();
  const today = todayIso();

  const { data: todayExpenses = [] } = useExpenses({
    startDate: today,
    endDate: today,
    pending: false,
  });
  const { data: recent = [] } = useExpenses({ pending: false });
  const { data: pending = [] } = usePendingExpenses();

  const totalToday = useMemo(
    () => todayExpenses.reduce((sum, e) => sum + (e.cost ?? 0), 0),
    [todayExpenses]
  );
  const approvedCount = todayExpenses.length;
  const pendingCount = pending.length;
  const recentExpenses = recent.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-2xl font-semibold">Good afternoon 👋</h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's your spending at a glance.
        </p>

        {/* Today Summary Card */}
        <div className="mt-5">
          <div
            className="rounded-3xl p-6 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)" }}
          >
            {/* Subtle ring decoration */}
            <div
              className="absolute -right-12 -top-12 w-48 h-48 rounded-full opacity-10"
              style={{ border: "40px solid white" }}
            />
            <div
              className="absolute -right-4 -bottom-16 w-40 h-40 rounded-full opacity-5"
              style={{ border: "30px solid white" }}
            />

            <p className="text-xs font-medium uppercase tracking-widest text-gray-400" style={{ letterSpacing: "0.12em" }}>
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
            <p className="mt-1 text-sm text-gray-400">
              {approvedCount} {approvedCount === 1 ? "expense" : "expenses"} logged
            </p>

            {/* Pending indicator */}
            {pendingCount > 0 && (
              <button
                onClick={() => nav("/voice")}
                className="mt-5 flex items-center gap-2.5 rounded-2xl px-4 py-2.5 transition-opacity hover:opacity-80"
                style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: "#f59e0b", boxShadow: "0 0 6px #f59e0b" }}
                />
                <span className="text-xs font-medium" style={{ color: "#fbbf24" }}>
                  {pendingCount} {pendingCount === 1 ? "expense" : "expenses"} need your review
                </span>
                <span className="text-xs ml-auto" style={{ color: "#fbbf24" }}>→</span>
              </button>
            )}
          </div>
        </div>

        {/* Recent expenses */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent</h2>
            <button
              onClick={() => nav("/expenses")}
              className="text-sm font-medium text-blue-600"
            >
              View all
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {recentExpenses.length === 0 ? (
              <li className="rounded-xl bg-white p-4 text-sm text-gray-400 ring-1 ring-gray-100">
                No expenses yet.
              </li>
            ) : (
              recentExpenses.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-xl bg-white p-4 text-sm ring-1 ring-gray-100"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{e.title}</span>
                    <span className="text-xs text-gray-400">
                      {e.category?.name ?? "Uncategorized"} · {e.date}
                    </span>
                  </div>
                  <span className="mono font-medium text-gray-900">
                    {e.cost != null ? `$${e.cost.toFixed(2)}` : "—"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
