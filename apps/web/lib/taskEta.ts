export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function parseTaskEtaDate(value: string | null | undefined): Date | undefined {
  const normalized = toDateInputValue(value);
  if (!normalized) return undefined;
  return new Date(`${normalized}T12:00:00.000Z`);
}

export function formatTaskEtaApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTaskEtaMinDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function getTaskEtaTodayString(): string {
  return formatTaskEtaApi(getTaskEtaMinDate());
}

export function isTaskEtaBeforeToday(value: string | null | undefined): boolean {
  const normalized = toDateInputValue(value);
  if (!normalized) return false;
  return normalized < getTaskEtaTodayString();
}

export function formatTaskEta(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${toDateInputValue(value)}T12:00:00.000Z`);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTaskEtaLogLabel(value: string | null | undefined): string {
  if (!value) return "None";
  return formatTaskEta(value);
}
