import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useCategories, useCreateManualExpense } from "../lib/queries";
import { currencySymbol } from "../lib/expenseFormat";
import { useAuth } from "../context/AuthContext";
import CategorySelect from "../components/CategorySelect";
import AddNotAllowed from "../components/AddNotAllowed";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Manual Add screen — simple form following the expense schema
 * (title, cost, category, date). Because the user is entering and confirming
 * everything themselves, a saved manual expense is NOT pending and does not
 * go through the approval queue (the backend sets pending: false).
 */
function ManualAdd() {
  const nav = useNavigate();
  const { canWrite } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 pb-28 h-full">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <button
          onClick={() => nav(-1)}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-gray-100"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold">Add expense</h1>
      </header>

      <main className="mx-auto max-w-md px-4 grow h-full">
        {canWrite?
          <AddForm/>
          :
          <AddNotAllowed/>
        }
      </main>
    </div>
  );
}

function AddForm({}){
  const nav = useNavigate();
  const { currentGroup } = useAuth();
  const currencyCode = currentGroup?.currency;
  const { data: categories = [] } = useCategories();
  const createExpense = useCreateManualExpense();

  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Give the expense a title.");
      return;
    }
    const costNum = Number(cost);
    if (cost.trim() === "" || Number.isNaN(costNum) || costNum < 0) {
      setError("Enter a valid cost.");
      return;
    }
    if (!categoryId) {
      setError("Pick a category.");
      return;
    }
    setError(null);

    try {
      await createExpense.mutateAsync({
        title: title.trim(),
        cost: costNum,
        categoryId,
        date,
      });
      nav("/");
    } catch {
      setError("Couldn't save the expense. Try again.");
    }
  };

  const saving = createExpense.isPending;
  return (
  <>
        <div className="mt-4 space-y-4 rounded-2xl bg-white p-5 shadow-sm shadow-black/5 border border-[#d9d9d9]">
          {/* Title */}
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly groceries"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
            />
          </Field>

          {/* Cost */}
          <Field label="Cost">
            <div className="flex items-center rounded-lg border border-gray-200 px-3 focus-within:border-gray-900">
               <span className="text-sm text-gray-400">{currencySymbol(currencyCode)}</span>
              <input
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full bg-transparent px-1 py-2.5 text-sm focus:outline-none mono"
              />
            </div>
          </Field>

          {/* Category */}
          <Field label="Category">
            <CategorySelect
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
            />
          </Field>

          {/* Date */}
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
            />
          </Field>

          {error && <p className="text-xs font-medium text-red-500">{error}</p>}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: "#00c48c" }}
        >
          <Check size={17} />
          {saving ? "Saving…" : "Save expense"}
        </button>
        <p className="mt-2 text-center text-xs text-gray-400">
          Saved directly — no approval needed.
        </p>
  </>
  )
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}

export default ManualAdd;
