export type MentionUser = { id: string; username: string; name: string };

export type CommentPart =
  | { type: "text"; value: string }
  | { type: "mention"; value: string; user: MentionUser };

const MENTION_RE = /@([a-zA-Z0-9_]+)/g;

export function parseCommentMentions(body: string, users: MentionUser[]): CommentPart[] {
  const byUsername = new Map(users.map((u) => [u.username.toLowerCase(), u]));
  const parts: CommentPart[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = MENTION_RE.exec(body)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: body.slice(last, match.index) });
    }

    const username = match[1]!;
    const user = byUsername.get(username.toLowerCase());
    if (user) {
      parts.push({ type: "mention", value: `@${user.username}`, user });
    } else {
      parts.push({ type: "text", value: match[0] });
    }

    last = match.index + match[0].length;
  }

  if (last < body.length) {
    parts.push({ type: "text", value: body.slice(last) });
  }

  return parts;
}

export function getActiveMentionQuery(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  const before = text.slice(0, cursor);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;

  const segment = before.slice(at + 1);
  if (segment.includes(" ") || segment.includes("\n")) return null;
  if (at > 0) {
    const prev = before[at - 1];
    if (prev && !/\s/.test(prev)) return null;
  }

  return { start: at, query: segment };
}

export function filterMentionUsers(users: MentionUser[], query: string): MentionUser[] {
  const q = query.trim().toLowerCase();
  if (!q) return users.slice(0, 8);

  return users
    .filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q),
    )
    .slice(0, 8);
}

export function insertMention(
  text: string,
  mentionStart: number,
  cursor: number,
  username: string,
): { value: string; cursor: number } {
  const before = text.slice(0, mentionStart);
  const after = text.slice(cursor);
  const mention = `@${username} `;
  const value = `${before}${mention}${after}`;
  return { value, cursor: before.length + mention.length };
}
