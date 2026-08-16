import { useState } from "react";
import { Check, Mic, Pencil, X } from "lucide-react";
import type { Category, Expense } from "../types";
import { useUpdateExpense } from "../lib/queries";
import {
  colorForCategory,
  formatCurrency,
  formatRelativeDate,
} from "../lib/expenseFormat";

interface ExpenseListItemProps {
  expense: Expense;
  categories: Category[];
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
}: ExpenseListItemProps) {
  const [editing, setEditing] = useState(false);

  return editing ? (
    <EditRow
      expense={expense}
      categories={categories}
      onDone={() => setEditing(false)}
    />
  ) : (
    <DisplayRow expense={expense} onEdit={() => setEditing(true)} />
  );
}

function DisplayRow({
  expense,
  onEdit,
}: {
  expense: Expense;
  onEdit: () => void;
}) {
  const color = colorForCategory(expense.categoryId);

  return (
    <li className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-100">
      {/* Category color dot */}
      <span
        className="h-8 w-1.5 flex-shrink-0 rounded-full"
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
              className="flex-shrink-0 text-gray-400"
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
        <span className="mono flex-shrink-0 text-base font-semibold text-gray-900">
          {formatCurrency(expense.cost)}
        </span>
      ) : (
        <span
          className="flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{ background: "rgba(245,158,11,0.15)", color: "#b45309" }}
        >
          Pending
        </span>
      )}

      <button
        onClick={onEdit}
        aria-label={`Edit ${expense.title}`}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500 ring-1 ring-gray-100"
      >
        <Pencil size={14} />
      </button>
    </li>
  );
}

function EditRow({
  expense,
  categories,
  onDone,
}: {
  expense: Expense;
  categories: Category[];
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
    <li className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium focus:border-gray-900 focus:outline-none"
        />

        <div className="flex gap-2">
          <div className="flex flex-1 items-center rounded-lg border border-gray-200 px-2 focus-within:border-gray-900">
            <span className="text-sm text-gray-400">$</span>
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
