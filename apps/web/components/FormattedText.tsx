import { Fragment } from "react";
import { parseInlineMarkup } from "@/lib/inlineMarkup";
import { parseCommentMentions, type MentionUser } from "@/lib/mentions";

type FormattedTextProps = {
  text: string;
  users?: MentionUser[];
  className?: string;
  as?: "p" | "span" | "div";
};

function renderMarkupSpans(text: string, keyPrefix: string) {
  return parseInlineMarkup(text).map((part, index) =>
    part.type === "bold" ? (
      <strong key={`${keyPrefix}-b-${index}`}>{part.value}</strong>
    ) : (
      <Fragment key={`${keyPrefix}-t-${index}`}>{part.value}</Fragment>
    ),
  );
}

export function FormattedText({
  text,
  users,
  className,
  as: Tag = "p",
}: FormattedTextProps) {
  const content =
    users && users.length > 0
      ? parseCommentMentions(text, users).map((part, index) =>
          part.type === "mention" ? (
            <span
              key={`m-${index}-${part.user.id}`}
              className="bb-comment-mention"
              title={part.user.name}
            >
              @{part.user.username}
            </span>
          ) : (
            <Fragment key={`p-${index}`}>{renderMarkupSpans(part.value, `p${index}`)}</Fragment>
          ),
        )
      : renderMarkupSpans(text, "root");

  return <Tag className={className}>{content}</Tag>;
}
