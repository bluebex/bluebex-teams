import { TASK_CATEGORY_LABELS, type TaskCategory } from "@/lib/taskCategory";

export function CategoryBadge({ category }: { category: TaskCategory }) {
  return (
    <span
      className={`bb-admin-badge bb-category-badge bb-category-badge--${category.toLowerCase()}`}
    >
      {TASK_CATEGORY_LABELS[category]}
    </span>
  );
}
