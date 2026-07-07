"use client";

import { AdminModal } from "@/components/AdminModal";
import { CommentBody } from "@/components/CommentBody";
import type { MentionUser } from "@/lib/mentions";

export type CommentEditLog = {
  id: string;
  fromBody: string;
  toBody: string;
  editedAt: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type CommentEditHistoryModalProps = {
  open: boolean;
  editLogs: CommentEditLog[];
  users: MentionUser[];
  onClose: () => void;
};

export function CommentEditHistoryModal({
  open,
  editLogs,
  users,
  onClose,
}: CommentEditHistoryModalProps) {
  return (
    <AdminModal
      open={open}
      title="Comment edit history"
      wide
      onClose={onClose}
      footer={
        <button type="button" className="bb-admin-btn bb-admin-btn-outline" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="bb-comment-edit-history">
        {editLogs.map((log, index) => (
          <div key={log.id} className="bb-comment-edit-history-entry">
            <div className="bb-admin-cell-sub mb-2">
              Edit {index + 1} • {formatDateTime(log.editedAt)}
            </div>
            <div className="bb-comment-edit-history-diff">
              <div className="bb-comment-edit-history-side">
                <div className="bb-admin-label">Before</div>
                <CommentBody body={log.fromBody} users={users} />
              </div>
              <div className="bb-comment-edit-history-side">
                <div className="bb-admin-label">After</div>
                <CommentBody body={log.toBody} users={users} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminModal>
  );
}
