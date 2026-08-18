/**
 * Base categories cloned into every new group on creation. Each clone gets
 * is_base = true so the UI can distinguish seeded categories from custom ones.
 */
export interface BaseCategory {
  name: string;
  color: string;
  icon: string;
}

export const BASE_CATEGORIES: BaseCategory[] = [
  { name: "Groceries", color: "#4CAF50", icon: "shopping-cart" },
  { name: "Dining", color: "#FF9800", icon: "utensils" },
  { name: "Transport", color: "#2196F3", icon: "car" },
  { name: "Household", color: "#9C27B0", icon: "home" },
  { name: "Health", color: "#F44336", icon: "heart-pulse" },
  { name: "Other", color: "#607D8B", icon: "ellipsis" },
];
