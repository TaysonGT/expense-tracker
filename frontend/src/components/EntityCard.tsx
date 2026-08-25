import { useState } from "react";
import { AlertCircle, Check, Settings2, Trash2 } from "lucide-react";
import type { Category, ParsedEntity } from "../types";
import { currencySymbol } from "../lib/expenseFormat";
import CategoryManagementModal from "./CategoryManagementModal";

interface EntityCardProps {
  entity: ParsedEntity;
  categories: Category[];
  onChange: (updated: ParsedEntity) => void;
  onApprove: (entity: ParsedEntity) => void;
  onRemove: (entity: ParsedEntity) => void;
  approved?: boolean;
  /** ISO currency code for the cost input prefix. */
  currencyCode?: string;
  isApproving?: boolean;
  isRemoving?: boolean;
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
  onRemove,
  approved = false,
  currencyCode,
  isApproving,
  isRemoving
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
      className={`rounded-2xl bg-card p-4 shadow-sm border transition-colors ${needsAttention? 'border-warning':'border-border-light'}`}
      style={{
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
      <label className="block text-[11px] font-medium uppercase tracking-wide text-empty-title">
        Item
      </label>
      <input
        value={entity.title}
        onChange={(e) => onChange({ ...entity, title: e.target.value })}
        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-empty-title focus:border-card-hover focus:outline-none bg-card-light"
        placeholder="What did you buy?"
      />

      <div className="mt-3 flex gap-3">
        {/* Category */}
        <div className="flex-1">
          <label className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-empty-title">
            <span>
              Category
              {entity.categoryUncertain && !approved && (
                <span className="ml-1 text-warning-secondary">• confirm</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setManagingCategories(true)}
              aria-label="Manage categories"
              title="Manage categories"
              className="flex h-5 w-5 items-center justify-center rounded text-empty-title hover:text-empty-subtitle"
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
            className={`mt-1 w-full bg-card-light rounded-lg border px-3 py-2 text-sm focus:outline-none ${missingCategory? 'border-warning-secondary text-warning':'border-border text-primary'}`}
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
          <label className="block text-[11px] font-medium uppercase tracking-wide text-empty-title">
            Cost
          </label>
          <div
            className={`mt-1 flex items-center bg-card-light rounded-lg border px-2 ${missingCost?'border-warning-secondary text-warning':'border-border text-primary'}`}
          >
            <span className="text-sm text-empty-title">{currencySymbol(currencyCode)}</span>
            <input
              value={costText}
              onChange={(e) => commitCost(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full px-1 py-2 text-sm focus:outline-none mono text-primary"
            />
          </div>
        </div>
      </div>

      {/* Attention hint + approve */}
      <div className="mt-3 flex items-center justify-between">
        {needsAttention && !approved ? (
          <span className="flex items-center gap-1 text-xs text-warning-secondary">
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={approved||isRemoving||isApproving}
            onClick={()=>onRemove(entity)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-40 ${isRemoving||isApproving? 'bg-empty-subtitle' : approved ? "bg-[#9ca3af]" : "bg-danger"}`}
          >
            {isRemoving? '' :  <Trash2 size={14} /> }

            {isRemoving? 'Removing...' : "Remove"}
          </button>
          <button
            type="submit"
            disabled={approved||isApproving||isRemoving}
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: isApproving? '#d9d9d9' : approved ? "#9ca3af" : "#00c48c" }}
          >
            {isApproving? '' :  <Check size={14} /> }

            {isApproving? 'Approving...' : approved ? "Approved" : "Approve"}
          </button>
        </div>
      </div>

      <CategoryManagementModal
        open={managingCategories}
        onClose={() => setManagingCategories(false)}
      />
    </form>
  );
}

export default EntityCard;
