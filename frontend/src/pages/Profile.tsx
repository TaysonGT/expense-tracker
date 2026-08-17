import { useMemo } from "react";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Mail,
  Moon,
  Settings,
  Shield,
  User,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { useExpenses } from "../lib/queries";

/**
 * Mock profile page (v1 placeholder — there's no real auth/user backend yet).
 *
 * Layout: a hero card with a large avatar and the user's name/email, a
 * "Your stats" summary pulled from the existing expenses query (total
 * spending, expense count this month, categories used), and a settings-style
 * action list. Styled in the same soft-white / rounded-2xl language as the
 * rest of the app.
 */

// No auth/user endpoint in v1 — these are hardcoded placeholders.
const USER_NAME = "Mohamed";
const USER_EMAIL = "mohamed@example.com";

export default function Profile() {
  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString().slice(0, 10);
  const monthEnd = now.toISOString().slice(0, 10);

  const expensesQuery = useExpenses({
    startDate: monthStart,
    endDate: monthEnd,
    pending: false,
  });

  const expenses = expensesQuery.data ?? [];

  const stats = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + (e.cost ?? 0), 0);
    const byCategory = new Map<string, number>();
    expenses.forEach((e) => {
      const key = e.category?.name ?? "Uncategorized";
      byCategory.set(key, (byCategory.get(key) ?? 0) + (e.cost ?? 0));
    });
    const topCategory = [...byCategory.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0];
    return {
      total,
      count: expenses.length,
      topCategory: topCategory ? topCategory[0] : null,
    };
  }, [expenses]);

  const currency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(n);

  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-gray-50/90 px-4 py-4 backdrop-blur">
        <h1 className="text-lg font-semibold">Profile</h1>
        <Moon size={18} className="text-gray-400" />
      </header>

      <main className="mx-auto max-w-md px-4">
        <div className="space-y-6">
          {/* Hero: avatar + name */}
          <section className="flex flex-col items-center rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-100 text-gray-500 ring-2 ring-gray-200">
              <User size={56} />
            </div>
            <div className="mt-4">
              <h2 className="text-xl font-semibold">{USER_NAME}</h2>
              <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-gray-500">
                <Mail size={14} />
                {USER_EMAIL}
              </p>
            </div>
            <button
              aria-label="Edit profile"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200"
            >
              Edit profile
            </button>
          </section>

          {/* Stats summary */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">
              Your stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<CreditCard size={18} />}
                label="This month"
                value={currency(stats.total)}
              />
              <StatCard
                icon={<Bell size={18} />}
                label="Expenses"
                value={String(stats.count)}
              />
              {stats.topCategory && (
                <StatCard
                  icon={<Bell size={18} />}
                  label="Top category"
                  value={stats.topCategory}
                />
              )}
            </div>
          </section>

          {/* Action list */}
          <section className="space-y-1.5">
            <ActionItem
              icon={<Settings size={18} />}
              label="Settings"
              onClick={() => {}}
            />
            <ActionItem
              icon={<Shield size={18} />}
              label="Privacy & security"
              onClick={() => {}}
            />
            <ActionItem
              icon={<HelpCircle size={18} />}
              label="Help & feedback"
              onClick={() => {}}
            />
            <ActionItem
              icon={<LogOut size={18} />}
              label="Log out"
              onClick={() => {}}
              danger
            />
          </section>

          {/* Footer note / placeholder marker */}
          <p className="text-center text-[10px] text-gray-400">
            Profile screen is a v1 mock — no backend auth wired yet.
          </p>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-100">
      <div className="flex items-center gap-2">
        <span className="text-gray-500">{icon}</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ActionItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left ring-1 ring-gray-100 transition-colors hover:bg-gray-50"
    >
      <span className="flex items-center gap-3">
        <span
          className={`text-gray-500`}
          style={{ color: danger ? "#ef4444" : undefined }}
        >
          {icon}
        </span>
        <span
          className="text-sm font-medium"
          style={{ color: danger ? "#ef4444" : "#111827" }}
        >
          {label}
        </span>
      </span>
      <ChevronRight size={16} className="text-gray-300" />
    </button>
  );
}
