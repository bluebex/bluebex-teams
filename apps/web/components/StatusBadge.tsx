import {
  formatTaskStatusLabel,
  type TaskStatus,
} from "@/lib/taskStatus";

export function StatusBadge({
  status,
  assignedTo,
}: {
  status: TaskStatus;
  assignedTo?: { id: string } | null;
}) {
  const unassigned = !assignedTo;
  const badgeClass = unassigned
    ? "bb-status-badge--unassigned"
    : `bb-status-badge--${status.toLowerCase()}`;

  return (
    <span className={`bb-admin-badge bb-status-badge ${badgeClass}`}>
      {formatTaskStatusLabel(status, assignedTo)}
    </span>
  );
}
