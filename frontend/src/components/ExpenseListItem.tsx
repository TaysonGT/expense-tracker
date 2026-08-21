import { useState } from "react";
import { Check, Mic, Pencil, X, MoreVertical, Trash2, User, ExternalLink } from "lucide-react";
import type { Category, Expense } from "../types";
import { useUpdateExpense, useDeleteExpense } from "../lib/queries";
import {
  colorForCategory,
  currencySymbol,
  formatCurrency,
  formatRelativeDate,
} from "../lib/expenseFormat";

interface ExpenseListItemProps {
  expense: Expense;
  categories: Category[];
  /** ISO currency code for formatting the cost value. */
  currencyCode?: string;
}

/**
 * A single expense row with an inline edit state. Collapsed, it shows a colored
 * category tag, a voice-source indicator, the title, relative date, and a
 * prominent right-aligned cost (or a pending badge). Expanded, title/cost/
 * category/date become editable and save via the general PATCH /expenses/:id.
 */
export default function ExpenseListItem({
  expense,
  categories,
  currencyCode,
}: ExpenseListItemProps) {
  const [editing, setEditing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [optionsAnchor, setOptionsAnchor] = useState<HTMLElement | null>(null);

  const deleteExpense = useDeleteExpense();

  return editing ? (
    <EditRow
      expense={expense}
      categories={categories}
      currencyCode={currencyCode}
      onDone={() => setEditing(false)}
    />
  ) : (
    <DisplayRow
      expense={expense}
      onEdit={() => setEditing(true)}
      onOptionsClick={(e) => {
        setOptionsAnchor(e.currentTarget);
        setShowOptions(true);
      }}
      showOptions={showOptions}
      optionsAnchor={optionsAnchor}
      onCloseOptions={() => {
        setShowOptions(false);
        setOptionsAnchor(null);
      }}
      onDelete={() => {
        if (window.confirm("Delete this expense?")) {
          deleteExpense.mutate(expense.id);
        }
        setShowOptions(false);
        setOptionsAnchor(null);
      }}
    />
  );
}

function DisplayRow({
  expense,
  onEdit,
  onOptionsClick,
  showOptions,
  optionsAnchor,
  onCloseOptions,
  onDelete,
}: {
  expense: Expense;
  onEdit: () => void;
  onOptionsClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  showOptions: boolean;
  optionsAnchor: HTMLElement | null;
  onCloseOptions: () => void;
  onDelete: () => void;
}) {
  const color = colorForCategory(expense.categoryId);
  const creatorName = expense.createdByName ?? "Unknown";

  return (
    <>
      <li className="relative flex items-center gap-3 rounded-xl bg-white p-4 py-2 border border-[#d3d3d3]">
        {/* Category color dot */}
        <span
          className="h-8 w-1.5 shrink-0 rounded-full"
          style={{ background: color }}
          aria-hidden
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium text-gray-900">
              {expense.title}
            </span>
            {expense.source === "voice" && (
              <Mic
                size={12}
                className="shrink-0 text-gray-400"
                aria-label="Added by voice"
              />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
            <span
              className="rounded-full px-2 py-0.5 font-medium"
              style={{ background: `${color}1a`, color }}
            >
              {expense.category?.name ?? "Uncategorized"}
            </span>
            <span>{formatRelativeDate(expense.date)}</span>
          </div>
        </div>

        {/* Cost (prominent, right-aligned) or pending badge */}
        {expense.cost != null ? (
          <span className="mono shrink-0 text-sm font-semibold text-gray-900">
            {formatCurrency(expense.cost)}
          </span>
        ) : (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ background: "rgba(245,158,11,0.15)", color: "#b45309" }}
          >
            Pending
          </span>
        )}

        {/* Three-dot options menu */}
        <div className="relative">
          <button
            onClick={onOptionsClick}
            aria-label="More options"
            aria-expanded={showOptions}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500 border border-[#d3d3d3]"
          >
            <MoreVertical size={16} />
          </button>

          {showOptions && optionsAnchor && (
            <OptionsMenu
              anchor={optionsAnchor}
              onClose={onCloseOptions}
              onEdit={onEdit}
              onDelete={onDelete}
              creatorName={creatorName}
            />
          )}
        </div>
      </li>

      {/* Global click handler to close options */}
      {showOptions && (
        <div
          className="fixed inset-0 z-40"
          onClick={onCloseOptions}
          aria-hidden="true"
        />
      )}
    </>
  );
}

/** The dropdown menu that appears below the three-dot button. */
function OptionsMenu({
  anchor,
  onClose,
  onEdit,
  onDelete,
  creatorName,
}: {
  anchor: HTMLElement;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  creatorName: string;
}) {
  const anchorRect = anchor.getBoundingClientRect();
  const menuWidth = 180;

  return (
    <div
      className="fixed z-50 rounded-xl bg-white shadow-lg border border-gray-100 py-1"
      style={{
        top: anchorRect.bottom + 4,
        left: Math.max(8, anchorRect.right - menuWidth),
        width: menuWidth,
      }}
      role="menu"
    >
      <button
        onClick={() => { onEdit(); onClose(); }}
        role="menuitem"
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-gray-50"
      >
        <Pencil size={14} className="text-gray-400" />
        Edit
      </button>
      <button
        onClick={() => { onDelete(); onClose(); }}
        role="menuitem"
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
      >
        <Trash2 size={14} />
        Delete
      </button>
      <div className="border-t border-gray-100 my-1" />
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
        <User size={14} className="text-gray-400" />
        <span className="truncate">Created by {creatorName}</span>
        <ExternalLink size={12} className="ml-auto text-gray-300" />
      </div>
    </div>
  );
}

function EditRow({
  expense,
  categories,
  currencyCode,
  onDone,
}: {
  expense: Expense;
  categories: Category[];
  currencyCode?: string;
  onDone: () => void;
}) {
  const updateExpense = useUpdateExpense();

  const [title, setTitle] = useState(expense.title);
  const [cost, setCost] = useState(expense.cost != null ? String(expense.cost) : "");
  const [categoryId, setCategoryId] = useState(expense.categoryId ?? "");
  const [date, setDate] = useState(expense.date);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const trimmedCost = cost.trim();
    const costNum = trimmedCost === "" ? null : Number(trimmedCost);
    if (costNum != null && (Number.isNaN(costNum) || costNum < 0)) {
      setError("Enter a valid cost.");
      return;
    }
    setError(null);

    try {
      await updateExpense.mutateAsync({
        id: expense.id,
        title: title.trim(),
        cost: costNum,
        categoryId: categoryId || null,
        date,
      });
      onDone();
    } catch {
      setError("Couldn't save. Try again.");
    }
  };

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm border border-[#d3d3d3]">
      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium focus:border-gray-900 focus:outline-none"
        />

        <div className="flex gap-2">
          <div className="flex flex-1 items-center rounded-lg border border-gray-200 px-2 focus-within:border-gray-900">
            <span className="text-sm text-gray-400">{currencySymbol(currencyCode)}</span>
            <input
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="mono w-full bg-transparent px-1 py-2 text-sm focus:outline-none"
            />
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {error && <p className="text-xs font-medium text-red-500">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onDone}
            disabled={updateExpense.isPending}
            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-4 py-1.5 text-xs font-medium text-gray-600"
          >
            <X size={14} />
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={updateExpense.isPending}
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "#00c48c" }}
          >
            <Check size={14} />
            {updateExpense.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </li>
  );
}