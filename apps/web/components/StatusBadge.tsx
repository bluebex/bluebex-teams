import {
  formatTaskStatusLabel,
  statusBadgeClass,
  statusBadgeUsesUnassignedStyle,
  type TaskStatus,
} from "@/lib/taskStatus";

export function StatusBadge({
  status,
  assignedTo,
}: {
  status: TaskStatus;
  assignedTo?: { id: string } | null;
}) {
  const unassigned = statusBadgeUsesUnassignedStyle(status, assignedTo);
  const badgeClass = unassigned
    ? "bb-status-badge--unassigned"
    : statusBadgeClass(status);

  return (
    <span className={`bb-admin-badge bb-status-badge ${badgeClass}`}>
      {formatTaskStatusLabel(status, assignedTo)}
    </span>
  );
}
