export type TaskCategory = "TASK" | "BUG";

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  TASK: "Task",
  BUG: "Bug",
};

export const TASK_CATEGORY_OPTIONS: { value: TaskCategory; label: string }[] = (
  Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]
).map((value) => ({
  value,
  label: TASK_CATEGORY_LABELS[value],
}));

export function formatTaskCategoryLogLabel(value: string | null | undefined) {
  if (!value) return "Unknown";
  if (value in TASK_CATEGORY_LABELS) return TASK_CATEGORY_LABELS[value as TaskCategory];
  return value;
}

export function parseTaskCategory(value: string | null | undefined): TaskCategory | null {
  if (value === "TASK" || value === "BUG") return value;
  return null;
}
