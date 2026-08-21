import { useState } from "react";
import { AlertCircle, Check, Settings2 } from "lucide-react";
import type { Category, ParsedEntity } from "../types";
import { currencySymbol } from "../lib/expenseFormat";
import CategoryManagementModal from "./CategoryManagementModal";

interface EntityCardProps {
  entity: ParsedEntity;
  categories: Category[];
  onChange: (updated: ParsedEntity) => void;
  onApprove: (entity: ParsedEntity) => void;
  approved?: boolean;
  /** ISO currency code for the cost input prefix. */
  currencyCode?: string;
  isLoading?: boolean;
}

/**
 * Editable card for a single LLM-parsed entity. Title, category and cost are
 * all editable/confirmable. Highlights missing cost or an uncertain/absent
 * category so the user knows what needs attention before approving.
 */
function EntityCard({
  entity,
  categories,
  onChange,
  onApprove,
  approved = false,
  currencyCode,
  isLoading
}: EntityCardProps) {
  const [costText, setCostText] = useState(
    entity.cost != null ? String(entity.cost) : ""
  );
  const [managingCategories, setManagingCategories] = useState(false);

  const missingCost = entity.cost == null;
  const missingCategory = entity.categoryId == null;
  const needsAttention = missingCost || missingCategory || entity.categoryUncertain;

  const commitCost = (raw: string) => {
    setCostText(raw);
    const parsed = raw.trim() === "" ? null : Number(raw);
    onChange({
      ...entity,
      cost: parsed != null && !Number.isNaN(parsed) ? parsed : null,
    });
  };

  return (
    <form
      className="rounded-2xl bg-white p-4 shadow-sm border transition-colors"
      style={{
        borderColor: needsAttention ? "rgba(245,158,11,0.4)" : "#d3d3d3",
        boxShadow: needsAttention
          ? "0 0 0 1px rgba(245,158,11,0.35)"
          : "0 1px 2px rgba(0,0,0,0.04)",
      }}
      onSubmit={(e)=>{
        e.preventDefault()
        onApprove(entity)
      }}
    >
      {/* Title */}
      <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
        Item
      </label>
      <input
        value={entity.title}
        onChange={(e) => onChange({ ...entity, title: e.target.value })}
        className="mt-1 w-full rounded-lg border border-[#d9d9d9] px-3 py-2 text-sm font-medium text-gray-900 focus:border-gray-900 focus:outline-none"
        placeholder="What did you buy?"
      />

      <div className="mt-3 flex gap-3">
        {/* Category */}
        <div className="flex-1">
          <label className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-gray-400">
            <span>
              Category
              {entity.categoryUncertain && !approved && (
                <span className="ml-1 text-amber-500">• confirm</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setManagingCategories(true)}
              aria-label="Manage categories"
              title="Manage categories"
              className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-gray-700"
            >
              <Settings2 size={13} />
            </button>
          </label>
          <select
            value={entity.categoryId ?? ""}
            onChange={(e) =>
              onChange({
                ...entity,
                categoryId: e.target.value || null,
                categoryUncertain: false,
              })
            }
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
            style={{
              borderColor: missingCategory ? "#f59e0b" : "#d9d9d9",
              color: missingCategory ? "#b45309" : "#111827",
            }}
          >
            <option value="">Choose…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cost */}
        <div className="w-28">
          <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Cost
          </label>
          <div
            className="mt-1 flex items-center rounded-lg border px-2"
            style={{ borderColor: missingCost ? "#f59e0b" : "#d9d9d9" }}
          >
            <span className="text-sm text-gray-400">{currencySymbol(currencyCode)}</span>
            <input
              value={costText}
              onChange={(e) => commitCost(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full bg-transparent px-1 py-2 text-sm focus:outline-none mono"
            />
          </div>
        </div>
      </div>

      {/* Attention hint + approve */}
      <div className="mt-3 flex items-center justify-between">
        {needsAttention && !approved ? (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle size={13} />
            {missingCost && missingCategory
              ? "Add cost & category"
              : missingCost
              ? "Add a cost"
              : "Confirm category"}
          </span>
        ) : (
          <span />
        )}

        <button
          type="submit"
          disabled={approved}
          className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: isLoading? '#d9d9d9' : approved ? "#9ca3af" : "#00c48c" }}
        >
          {isLoading? '' :  <Check size={14} /> }

          {isLoading? 'Approving...' : approved ? "Approved" : "Approve"}
        </button>
      </div>

      <CategoryManagementModal
        open={managingCategories}
        onClose={() => setManagingCategories(false)}
      />
    </form>
  );
}

export default EntityCard;
