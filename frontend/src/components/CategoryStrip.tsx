import { useState } from "react";
import { Settings2 } from "lucide-react";
import CategoryManagementModal from "./CategoryManagementModal";

interface CategoryStripProps {
  /** When true, renders shimmering skeleton chips instead of children. */
  isLoading?: boolean;
  /** How many skeleton chips to show while loading. */
  skeletonCount?: number;
  /** Home-style vertical divider after the manage button. */
  dividerAfterManage?: boolean;
  /** Extra classes for the outer row (margins/padding differ per page). */
  className?: string;
  /** The category chips/pills — each page renders its own variant here. */
  children?: React.ReactNode;
}

/**
 * Shared shell for the horizontal category strip used on both Home and the
 * Expenses page: a "manage categories" button (opening the shared modal) plus
 * a horizontally-scrollable row with a hidden scrollbar.
 *
 * The two pages serve different purposes — Home's chips navigate into the
 * filtered Expenses view, while the Expenses page's pills toggle an in-place
 * filter with an active state — so the chips themselves are passed as
 * `children`. Only the surrounding chrome, the manage modal, and the loading
 * skeleton are shared here.
 */
export default function CategoryStrip({
  isLoading = false,
  skeletonCount = 6,
  dividerAfterManage = false,
  className = "",
  children,
}: CategoryStripProps) {
  const [managing, setManaging] = useState(false);

  const manageButton = (
    <button
      type="button"
      onClick={() => setManaging(true)}
      aria-label="Manage categories"
      title="Manage categories"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1f1f1f] text-gray-300 ring-1 ring-gray-200"
    >
      <Settings2 size={16} />
    </button>
  );

  return (
    <div className={`flex w-full gap-1.5 ${className}`}>
      {dividerAfterManage ? (
        <div className="pe-1 border-e border-[#d3d3d3]">{manageButton}</div>
      ) : (
        manageButton
      )}

      <div className="flex grow min-w-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {isLoading ? <SkeletonChips count={skeletonCount} /> : children}
      </div>

      <CategoryManagementModal open={managing} onClose={() => setManaging(false)} />
    </div>
  );
}

/** A few gray, pulsing pill placeholders with varied widths. */
function SkeletonChips({ count }: { count: number }) {
  // Deterministic width variety so the row looks natural, not uniform.
  const widths = ["w-16", "w-20", "w-24", "w-16", "w-28", "w-20"];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`h-9 shrink-0 animate-pulse rounded-full bg-gray-200 ${
            widths[i % widths.length]
          }`}
          aria-hidden
        />
      ))}
    </>
  );
}
