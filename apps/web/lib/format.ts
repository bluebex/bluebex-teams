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

/** Capitalize the first letter of a string; leaves the rest unchanged. */
export function capitalizeFirstLetter(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
