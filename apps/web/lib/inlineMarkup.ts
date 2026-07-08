export type MarkupPart =
  | { type: "text"; value: string }
  | { type: "bold"; value: string };

/** Matches *text* spans (non-empty, no asterisks or newlines inside). */
const BOLD_RE = /\*([^*\n]+)\*/g;

export function parseInlineMarkup(text: string): MarkupPart[] {
  const parts: MarkupPart[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = BOLD_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: text.slice(last, match.index) });
    }
    parts.push({ type: "bold", value: match[1]! });
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }

  return parts.length > 0 ? parts : [{ type: "text", value: text }];
}
