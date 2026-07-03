import { parseCommentMentions, type MentionUser } from "@/lib/mentions";

export function CommentBody({ body, users }: { body: string; users: MentionUser[] }) {
  const parts = parseCommentMentions(body, users);

  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((part, index) =>
        part.type === "mention" ? (
          <span key={`${index}-${part.user.id}`} className="bb-comment-mention" title={part.user.name}>
            @{part.user.username}
          </span>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </p>
  );
}
