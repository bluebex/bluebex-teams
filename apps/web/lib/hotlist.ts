export type HotlistLite = {
  id: string;
  hotlistId: string;
  name: string;
};

export function formatHotlistLabel(hotlist: HotlistLite): string {
  return `${hotlist.name} (${hotlist.hotlistId})`;
}

export function hotlistFilterPath(hotlistId: string): string {
  return `/?hotlistId=${hotlistId}`;
}

export function formatHotlistChangeLogText(
  field: string,
  fromValue: string | null,
  toValue: string | null,
): string {
  if (field === "hotlist_add" && toValue) return `Added to hotlist ${toValue}`;
  if (field === "hotlist_remove" && fromValue) return `Removed from hotlist ${fromValue}`;
  return "";
}

export function formatChangeFieldLabel(field: string): string {
  if (field === "hotlist_add" || field === "hotlist_remove") return "hotlist";
  return field;
}
