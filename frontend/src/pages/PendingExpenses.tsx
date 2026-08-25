import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  useApproveExpense,
  useCategories,
  useDeleteExpense,
  usePendingExpenses,
} from "../lib/queries";
import type { Expense, ParsedEntity } from "../types";
import EntityCard from "../components/EntityCard";
import GroupSelector from "../components/GroupSelector";
import { useAuth } from "../context/AuthContext";

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
  const { currentGroup } = useAuth();
  const currencyCode = currentGroup?.currency;
  const { data: categories = [] } = useCategories();
  const {
    data: pending = [],
    isLoading,
    isError,
    refetch,
  } = usePendingExpenses();
  const approveExpense = useApproveExpense();
  const deleteExpense = useDeleteExpense();
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

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
      setApprovingIds((prev)=> new Set(prev).add(entity.id)) 
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
      } finally {
        setApprovingIds((prev)=> {
          const updated = new Set(prev)
          updated.delete(entity.id)
          return updated
        }) 
      }

    },
    [approveExpense]
  );

  const deleteEntity = useCallback(
    async (entity: ParsedEntity) => {
      setRemovingIds((prev)=> new Set(prev).add(entity.id)) 
      try {
        await deleteExpense.mutateAsync(entity.id);
        // The pending query is invalidated on success, so the item drops off.
        setEdits((prev) => {
          const next = { ...prev };
          delete next[entity.id];
          return next;
        });
      } catch {
        // Leave it in place so the user can retry.
      } finally {
        setRemovingIds((prev)=> {
          const updated = new Set(prev)
          updated.delete(entity.id)
          return updated
        }) 
      }

    },
    [approveExpense]
  );

  return (
    <div className="min-h-screen bg-background pb-28 text-primary">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-background/90 px-4 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav(-1)}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold">Pending review</h1>
        </div>
        <GroupSelector />
      </header>

      <main className="mx-auto max-w-md px-4">
        {/* Loading */}
        {isLoading && (
          <div className="mt-4 space-y-3">
            <div className="h-40 animate-pulse rounded-2xl bg-skeleton" />
            <div className="h-40 animate-pulse rounded-2xl bg-skeleton" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="mt-16 flex flex-col items-center">
            <p className="text-sm font-medium text-primary">
              Couldn't load pending items.
            </p>
            <button
              onClick={() => void refetch()}
              className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && pending.length === 0 && (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-300/10">
              <CheckCircle2 size={30} />
            </div>
            <p className="mt-5 text-base font-medium text-primary">
              You're all caught up
            </p>
            <p className="mt-1 max-w-xs text-sm text-background0">
              No expenses waiting for review. New voice entries will show up
              here.
            </p>
            <button
              onClick={() => nav("/expenses")}
              className="mt-6 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              View all expenses
            </button>
          </div>
        )}

        {/* Queue */}
        {!isLoading && !isError && pending.length > 0 && (
          <div className="mt-4">
            <p className="mb-3 text-sm text-background0">
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
                  isApproving={approvingIds.has(e.id)}
                  isRemoving={removingIds.has(e.id)}
                  currencyCode={currencyCode}
                  onChange={updateEntity}
                  onApprove={approveEntity}
                  onRemove={deleteEntity}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
