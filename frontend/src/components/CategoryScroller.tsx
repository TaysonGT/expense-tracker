import { useNavigate } from "react-router";
import { useCategories } from "../lib/queries";
import { Settings2 } from "lucide-react";
import CategoryManagementModal from "./CategoryManagementModal";
import { useState } from "react";

/**
 * Horizontal, scrollable strip of category chips. Not tied to "today" — it
 * reflects the user's category set and offers a quick jump into the filtered
 * Expenses view. Shown on both the empty and populated Home states.
 */
export default function CategoryScroller() {
  const [managing, setManaging] = useState(false);
  const nav = useNavigate();
  const { data: categories = [] } = useCategories();

  if (categories.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-medium text-gray-500">Categories</h2>
      <div className="flex w-full -mx-4 px-4 pb-1 gap-1">
        <div className="pe-1 border-e border-[#d3d3d3]">
          <button
            type="button"
            onClick={() => setManaging(true)}
            aria-label="Manage categories"
            title="Manage categories"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#1f1f1f] text-gray-300 ring-1 ring-gray-200"
          >
            <Settings2 size={16} />
          </button>
        </div>
        <div className="grow min-w-0 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => nav("/expenses")}
              className="flex-shrink-0 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 border border-[#d3d3d3] shadow-sm shadow-black/5 z-2 transition-transform active:scale-95"
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <CategoryManagementModal
        open={managing}
        onClose={() => setManaging(false)}
      />
    </section>
  );
}
