export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "DONE"
  | "WONT_FIX_INFEASIBLE"
  | "WONT_FIX_OBSOLETE";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  WONT_FIX_INFEASIBLE: "Won't Fix (Infeasible)",
  WONT_FIX_OBSOLETE: "Won't Fix (Obsolete)",
};

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = (
  Object.keys(TASK_STATUS_LABELS) as TaskStatus[]
).map((value) => ({
  value,
  label: TASK_STATUS_LABELS[value],
}));

export const WONT_FIX_STATUSES: TaskStatus[] = [
  "WONT_FIX_INFEASIBLE",
  "WONT_FIX_OBSOLETE",
];

/** Terminal statuses excluded from the default assigned-to-me list. */
export const CLOSED_TASK_STATUSES: TaskStatus[] = ["DONE", ...WONT_FIX_STATUSES];

/** Default open statuses for assigned and bugs lists. */
export const OPEN_TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS"];

/** Statuses where an unassigned task shows "Unassigned" instead of the status label. */
const UNASSIGNED_DISPLAY_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS"];

/** Display label for task status in lists and badges. */
export function formatTaskStatusLabel(
  status: TaskStatus,
  assignedTo?: { id: string } | null,
): string {
  if (!assignedTo && UNASSIGNED_DISPLAY_STATUSES.includes(status)) return "Unassigned";
  return TASK_STATUS_LABELS[status];
}

export function statusBadgeUsesUnassignedStyle(
  status: TaskStatus,
  assignedTo?: { id: string } | null,
): boolean {
  return !assignedTo && UNASSIGNED_DISPLAY_STATUSES.includes(status);
}

export function statusBadgeClass(status: TaskStatus): string {
  if (WONT_FIX_STATUSES.includes(status)) return "bb-status-badge--wont-fix";
  return `bb-status-badge--${status.toLowerCase()}`;
}

/** Legacy status values kept for old log rows after enum migrations. */
const LEGACY_STATUS_LABELS: Record<string, string> = {
  BLOCKED: "Won't Fix (Infeasible)",
  INFEASIBLE: "Won't Fix (Infeasible)",
};

export function formatTaskStatusLogLabel(status: string | null): string {
  if (!status) return "—";
  if (status in TASK_STATUS_LABELS) {
    return TASK_STATUS_LABELS[status as TaskStatus];
  }
  return LEGACY_STATUS_LABELS[status] ?? status;
}
