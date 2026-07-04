import { TASK_PRIORITY_LABELS, type TaskPriority } from "@/lib/taskPriority";

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`bb-admin-badge bb-priority-badge bb-priority-badge--${priority.toLowerCase()}`}>
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  );
}
