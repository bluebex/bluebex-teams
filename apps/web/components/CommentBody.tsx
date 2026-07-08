import { FormattedText } from "@/components/FormattedText";
import type { MentionUser } from "@/lib/mentions";

export function CommentBody({ body, users }: { body: string; users: MentionUser[] }) {
  return (
    <FormattedText
      text={body}
      users={users}
      className="text-sm leading-relaxed whitespace-pre-wrap"
    />
  );
}
