import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "../lib/queries";
import type { Category } from "../types";

interface CategoryManagementModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Shared category management modal — a lightweight overlay (not a routed page)
 * so it can open on top of any screen without navigating away or losing that
 * screen's state.
 *
 * Lists categories from GET /categories with rename/delete actions and an add
 * input, wired to the categories mutations. Because those mutations invalidate
 * the categories query, every consumer (dropdowns, Home bar) updates
 * automatically.
 */
export default function CategoryManagementModal({
  open,
  onClose,
}: CategoryManagementModalProps) {
  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();

  const [newName, setNewName] = useState("");

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // if (!open) return null;

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createCategory.mutateAsync(name);
      setNewName("");
    } catch {
      // Keep the input so the user can retry.
    }
  };

  return (
    <div className={`fixed h-dvh inset-0 z-50 flex items-end justify-center sm:items-center ${open? 'pointer-events-auto':'pointer-events-none'} duration-400`}>
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 w-full h-full bg-black/40 backdrop-blur-[1px] ${open? 'opacity-100':'opacity-0'} duration-300`}
      />

      {/* Sheet */}
      <div className={`bottom-0 fixed z-10 flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-3xl bg-gray-50 shadow-xl  duration-200 ${open? 'translate-y-0':'translate-y-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-semibold">Manage categories</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white ring-1 ring-gray-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Add input */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 focus-within:border-gray-900">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAdd();
              }}
              placeholder="Add a category…"
              className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
            />
            <button
              onClick={() => void handleAdd()}
              disabled={!newName.trim() || createCategory.isPending}
              aria-label="Add category"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
              style={{ background: "#00c48c" }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto grow px-5 py-4">
          {categories.length === 0 ? (
            <p className="rounded-xl bg-white p-4 text-center text-sm text-gray-400 ring-1 ring-gray-100">
              No categories yet — add your first above.
            </p>
          ) : (
            <ul className="space-y-1">
              {categories.map((c) => (
                <CategoryRow key={c.id} category={c} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A single category row with inline rename and a delete action.
 */
function CategoryRow({ category }: { category: Category }) {
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Keep the local name in sync if the category changes underneath us.
  useEffect(() => {
    setName(category.name);
  }, [category.name]);

  const commitRename = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === category.name) {
      setName(category.name);
      setEditing(false);
      return;
    }
    try {
      await updateCategory.mutateAsync({ id: category.id, name: trimmed });
      setEditing(false);
    } catch {
      // Leave editing open so the user can retry.
    }
  };

  return (
    <li className="flex items-center gap-2 rounded-xl bg-white p-3 border border-[#e6e6e6]">
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commitRename();
            if (e.key === "Escape") {
              setName(category.name);
              setEditing(false);
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
          {category.name}
        </span>
      )}

      {editing ? (
        <button
          onClick={() => void commitRename()}
          disabled={updateCategory.isPending}
          aria-label="Save name"
          className="flex h-8 w-8 items-center justify-center rounded-full text-white disabled:opacity-40"
          style={{ background: "#00c48c" }}
        >
          <Check size={15} />
        </button>
      ) : confirmingDelete ? (
        <>
          <button
            onClick={() => deleteCategory.mutate(category.id)}
            disabled={deleteCategory.isPending}
            className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => setEditing(true)}
            aria-label={`Rename ${category.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-500 ring-1 ring-gray-100"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete ${category.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-red-500 ring-1 ring-gray-100"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </li>
  );
}
