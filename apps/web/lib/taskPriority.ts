export type TaskPriority = "P0" | "P1" | "P2";

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  P0: "P0",
  P1: "P1",
  P2: "P2",
};

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = (
  Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]
).map((value) => ({
  value,
  label: TASK_PRIORITY_LABELS[value],
}));

export function formatTaskPriorityLogLabel(value: string | null | undefined) {
  if (!value) return "Unknown";
  if (value in TASK_PRIORITY_LABELS) return TASK_PRIORITY_LABELS[value as TaskPriority];
  return value;
}

export function parseTaskPriority(value: string | null | undefined): TaskPriority | null {
  if (value === "P0" || value === "P1" || value === "P2") return value;
  return null;
}
