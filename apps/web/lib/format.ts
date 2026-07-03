/** Capitalize the first letter of each word in a full name. */
export function formatFullName(value: string): string {
  return value
    .split(" ")
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
