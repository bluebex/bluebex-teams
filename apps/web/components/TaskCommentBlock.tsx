"use client";

import { useState } from "react";
import { CommentBody } from "@/components/CommentBody";
import { CommentMentionInput } from "@/components/CommentMentionInput";
import {
  CommentEditHistoryModal,
  type CommentEditLog,
} from "@/components/CommentEditHistoryModal";
import type { MentionUser } from "@/lib/mentions";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type UserLite = { id: string; username: string; name: string };

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type TaskCommentBlockProps = {
  commentId: string;
  taskPublicId: string;
  body: string;
  createdAt: string;
  user: UserLite;
  editLogs: CommentEditLog[];
  users: MentionUser[];
  canEdit: boolean;
  onUpdated: () => Promise<void>;
};

export function TaskCommentBlock({
  commentId,
  taskPublicId,
  body,
  createdAt,
  user,
  editLogs,
  users,
  canEdit,
  onUpdated,
}: TaskCommentBlockProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const wasEdited = editLogs.length > 0;

  function startEditing() {
    setDraft(body);
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(body);
    setError(null);
    setEditing(false);
  }

  async function saveEdit() {
    const next = draft.trim();
    if (!next) {
      setError("Comment cannot be empty");
      return;
    }
    if (next === body) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/tasks/${taskPublicId}/comments/${commentId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Failed to update comment");
        return;
      }
      setEditing(false);
      await onUpdated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="bb-comment-block">
        <div className="bb-admin-cell-sub mb-1">
          {user.name} • {formatDateTime(createdAt)}
          {wasEdited ? (
            <>
              {" · "}
              <button
                type="button"
                className="bb-comment-edited-link"
                onClick={() => setHistoryOpen(true)}
              >
                edited
              </button>
            </>
          ) : null}
        </div>

        {editing ? (
          <div className="bb-comment-edit-form">
            <CommentMentionInput
              value={draft}
              onChange={setDraft}
              users={users}
              placeholder="Edit comment…"
              onSubmit={() => void saveEdit()}
              disabled={saving}
            />
            {error ? <div className="bb-alert-error mt-2">{error}</div> : null}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                className="bb-admin-btn"
                disabled={saving || !draft.trim()}
                onClick={() => void saveEdit()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="bb-admin-btn bb-admin-btn-outline"
                disabled={saving}
                onClick={cancelEditing}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className={canEdit ? "bb-comment-body-editable" : undefined}
            onDoubleClick={canEdit ? startEditing : undefined}
            title={canEdit ? "Double-click to edit" : undefined}
          >
            <CommentBody body={body} users={users} />
          </div>
        )}
      </div>

      <CommentEditHistoryModal
        open={historyOpen}
        editLogs={editLogs}
        users={users}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
