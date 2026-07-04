export const TASK_PUBLIC_ID_PATTERN = /^[A-Z0-9]{7}$/i;

export function normalizeTaskPublicId(value: string): string {
  return value.toUpperCase();
}

export function isTaskPublicId(value: string): boolean {
  return TASK_PUBLIC_ID_PATTERN.test(value);
}

export function taskPath(publicId: string): string {
  return `/${normalizeTaskPublicId(publicId)}`;
}

export function taskAbsoluteUrl(publicId: string): string {
  if (typeof window === "undefined") return taskPath(publicId);
  return `${window.location.origin}${taskPath(publicId)}`;
}
