import { useState } from "react";
import { Settings2 } from "lucide-react";
import type { Category } from "../types";
import CategoryManagementModal from "./CategoryManagementModal";

interface CategorySelectProps {
  categories: Category[];
  value: string; // categoryId or "" for none
  onChange: (categoryId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Category dropdown with a built-in "+ Manage categories" affordance that opens
 * the shared CategoryManagementModal on top of the current form — without
 * resetting or navigating away from whatever the user has already entered.
 *
 * The manage action lives in a small button beside the select rather than as a
 * fake <option>, so choosing it never clobbers the current selection.
 */
export default function CategorySelect({
  categories,
  value,
  onChange,
  className,
  style,
}: CategorySelectProps) {
  const [managing, setManaging] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={
            className ??
            "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
          }
          style={style}
        >
          {/* <option value="">{placeholder}</option> */}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setManaging(true)}
          aria-label="Manage categories"
          title="Manage categories"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500 ring-1 ring-gray-200"
        >
          <Settings2 size={16} />
        </button>
      </div>

      <CategoryManagementModal
        open={managing}
        onClose={() => setManaging(false)}
      />
    </>
  );
}
