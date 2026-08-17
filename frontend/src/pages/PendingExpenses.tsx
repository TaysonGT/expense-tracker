import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  useApproveExpense,
  useCategories,
  usePendingExpenses,
} from "../lib/queries";
import type { Expense, ParsedEntity } from "../types";
import EntityCard from "../components/EntityCard";

/**
 * Pending Expenses screen.
 *
 * Lists all pending (unconfirmed) expenses from GET /expenses/pending and lets
 * the user edit + approve each one via PATCH /expenses/:id/approve — the same
 * editable-card flow used in the Voice Capture review step, reused here as a
 * standalone queue reachable from Home's pending badge and the Expenses page.
 */
function toParsedEntity(e: Expense): ParsedEntity {
  return {
    id: e.id,
    title: e.title,
    cost: e.cost,
    categoryId: e.categoryId,
    categoryUncertain: e.categoryId == null,
  };
}

export default function PendingExpenses() {
  const nav = useNavigate();
  const { data: categories = [] } = useCategories();
  const {
    data: pending = [],
    isLoading,
    isError,
    refetch,
  } = usePendingExpenses();
  const approveExpense = useApproveExpense();

  // Local editable copies keyed by id; seeded lazily from the query as needed.
  const [edits, setEdits] = useState<Record<string, ParsedEntity>>({});

  const entityFor = useCallback(
    (e: Expense): ParsedEntity => edits[e.id] ?? toParsedEntity(e),
    [edits]
  );

  const updateEntity = useCallback((updated: ParsedEntity) => {
    setEdits((prev) => ({ ...prev, [updated.id]: updated }));
  }, []);

  const approveEntity = useCallback(
    async (entity: ParsedEntity) => {
      try {
        await approveExpense.mutateAsync({
          id: entity.id,
          title: entity.title,
          cost: entity.cost ?? undefined,
          categoryId: entity.categoryId ?? undefined,
        });
        // The pending query is invalidated on success, so the item drops off.
        setEdits((prev) => {
          const next = { ...prev };
          delete next[entity.id];
          return next;
        });
      } catch {
        // Leave it in place so the user can retry.
      }
    },
    [approveExpense]
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <button
          onClick={() => nav(-1)}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-gray-100"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold">Pending review</h1>
      </header>

      <main className="mx-auto max-w-md px-4">
        {/* Loading */}
        {isLoading && (
          <div className="mt-4 space-y-3">
            <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
            <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="mt-16 flex flex-col items-center">
            <p className="text-sm font-medium text-gray-800">
              Couldn't load pending items.
            </p>
            <button
              onClick={() => void refetch()}
              className="mt-4 rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && pending.length === 0 && (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100">
              <CheckCircle2 size={30} />
            </div>
            <p className="mt-5 text-base font-medium text-gray-800">
              You're all caught up
            </p>
            <p className="mt-1 max-w-xs text-sm text-gray-500">
              No expenses waiting for review. New voice entries will show up
              here.
            </p>
            <button
              onClick={() => nav("/expenses")}
              className="mt-6 rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white"
            >
              View all expenses
            </button>
          </div>
        )}

        {/* Queue */}
        {!isLoading && !isError && pending.length > 0 && (
          <div className="mt-4">
            <p className="mb-3 text-sm text-gray-500">
              {pending.length} item{pending.length === 1 ? "" : "s"} need
              {pending.length === 1 ? "s" : ""} a quick review before they're
              filed.
            </p>
            <div className="space-y-3">
              {pending.map((e) => (
                <EntityCard
                  key={e.id}
                  entity={entityFor(e)}
                  categories={categories}
                  onChange={updateEntity}
                  onApprove={approveEntity}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
