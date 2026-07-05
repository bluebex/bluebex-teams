export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "INFEASIBLE";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  INFEASIBLE: "Infeasible",
};

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = (
  Object.keys(TASK_STATUS_LABELS) as TaskStatus[]
).map((value) => ({
  value,
  label: TASK_STATUS_LABELS[value],
}));

/** Display label for task status in lists and badges. */
export function formatTaskStatusLabel(
  status: TaskStatus,
  assignedTo?: { id: string } | null,
): string {
  if (!assignedTo) return "Unassigned";
  return TASK_STATUS_LABELS[status];
}

/** Legacy status values kept for old log rows after enum migrations. */
const LEGACY_STATUS_LABELS: Record<string, string> = {
  BLOCKED: "Done",
};

export function formatTaskStatusLogLabel(status: string | null): string {
  if (!status) return "—";
  if (status in TASK_STATUS_LABELS) {
    return TASK_STATUS_LABELS[status as TaskStatus];
  }
  return LEGACY_STATUS_LABELS[status] ?? status;
}
