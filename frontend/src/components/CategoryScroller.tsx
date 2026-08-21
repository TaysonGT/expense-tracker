import { useNavigate } from "react-router";
import { useCategories } from "../lib/queries";
import CategoryStrip from "./CategoryStrip";

/**
 * Home's category strip: a horizontally-scrollable row of category chips that
 * navigate into the filtered Expenses view. Purpose here is navigation (not
 * in-place filtering), so it renders plain chips — the shared chrome, manage
 * modal, and loading skeleton come from CategoryStrip.
 */
export default function CategoryScroller() {
  const nav = useNavigate();
  const { data: categories = [], isLoading } = useCategories();

  // Hide the whole section only once we know there are genuinely no
  // categories (i.e. not while still loading).
  if (!isLoading && categories.length === 0) return null;

  return (
    <section className="mt-2">
      <h2 className="mb-3 text-sm font-medium text-gray-500">Categories</h2>
      <CategoryStrip
        isLoading={isLoading}
        dividerAfterManage
        className="-mx-4 ps-4"
      >
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => nav("/expenses")}
            className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 border border-[#d3d3d3] shadow-sm shadow-black/5 z-2 transition-transform active:scale-95"
          >
            {c.name}
          </button>
        ))}
      </CategoryStrip>
    </section>
  );
}
