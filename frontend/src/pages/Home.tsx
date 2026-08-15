/**
 * Home screen (placeholder).
 *
 * Per the spec, this screen will show:
 * - a greeting
 * - today's total spend + expense count in a prominent box
 * - a pending-items indicator/entry point inside that box
 * - a list of recent (non-pending) expenses
 * - a "View all" link to the Expenses page
 *
 * This is a scaffold placeholder — data wiring comes later.
 */
export default function Home() {
  const numbers= {
    // greeting: string;
    totalToday: 127.40,
    approvedCount: 4,
    pendingCount: 5,
    recentExpenses: [],
    onViewPending: () => console.log('lol'),
    onViewAll: () => console.log('null'),
  }
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-2xl font-semibold">Good afternoon 👋</h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's your spending at a glance.
        </p>

        {/* Prominent today's-total box */}
        {/* <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"> */}
        {/*   <div className="flex items-baseline justify-between"> */}
        {/*     <span className="text-sm font-medium text-gray-500"> */}
        {/*       Today's spend */}
        {/*     </span> */}
        {/*     <span className="text-xs text-gray-400">0 expenses</span> */}
        {/*   </div> */}
        {/*   <div className="mt-2 text-4xl font-bold tracking-tight">$0.00</div> */}

          {/* Pending-items entry point */}
        {/*   <button */}
        {/*     type="button" */}
        {/*     className="mt-4 flex w-full items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-left text-sm font-medium text-amber-800 ring-1 ring-amber-100" */}
        {/*   > */}
        {/*     <span>Pending items to review</span> */}
        {/*     <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs"> */}
        {/*       0 */}
        {/*     </span> */}
        {/*   </button> */}
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
              ${numbers.totalToday.toFixed(2)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            {numbers.approvedCount} {numbers.approvedCount === 1 ? "expense" : "expenses"} logged
          </p>

          {/* Pending indicator */}
          {numbers.pendingCount > 0 && (
            <button
              onClick={numbers.onViewPending}
              className="mt-5 flex items-center gap-2.5 rounded-2xl px-4 py-2.5 transition-opacity hover:opacity-80"
              style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "#f59e0b", boxShadow: "0 0 6px #f59e0b" }}
              />
              <span className="text-xs font-medium" style={{ color: "#fbbf24" }}>
                {numbers.pendingCount} {numbers.pendingCount === 1 ? "expense" : "expenses"} need your review
              </span>
              <span className="text-xs ml-auto" style={{ color: "#fbbf24" }}>→</span>
            </button>
          )}
        </div>
      </div>
       {/* </section> */}

        {/* Recent expenses */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent</h2>
            <a href="/expenses" className="text-sm font-medium text-blue-600">
              View all
            </a>
          </div>
          <ul className="mt-3 space-y-2">
            <li className="rounded-xl bg-white p-4 text-sm text-gray-400 ring-1 ring-gray-100">
              No expenses yet.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
