"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { CommentBody } from "@/components/CommentBody";
import { CommentMentionInput } from "@/components/CommentMentionInput";
import {
  formatTaskStatusLogLabel,
  TASK_STATUS_OPTIONS,
  type TaskStatus,
} from "@/lib/taskStatus";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type UserLite = { id: string; username: string; name: string };
type Task = {
  id: string;
  taskNumber: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: UserLite;
  assignedTo: UserLite | null;
  project: { id: string; name: string };
  process: { id: string; name: string };
  comments: { id: string; body: string; createdAt: string; user: UserLite }[];
  statusLogs: {
    id: string;
    fromStatus: TaskStatus | null;
    toStatus: TaskStatus;
    createdAt: string;
    user: UserLite;
  }[];
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

export default function TaskPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [error, setError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useMemo(
    () => async () => {
      const [taskRes, metaRes] = await Promise.all([
        fetch(`${API_URL}/tasks/${id}`, { credentials: "include" }),
        fetch(`${API_URL}/tasks/meta`, { credentials: "include" }),
      ]);
      if (taskRes.status === 401 || metaRes.status === 401) {
        return (window.location.href = "/login");
      }
      if (!taskRes.ok) return setError("Failed to load task");
      const taskData = await taskRes.json();
      setTask(taskData.task);
      setStatus(taskData.task.status);
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        setUsers(metaData.users || []);
      }
    },
    [id],
  );

  useEffect(() => {
    if (!id) return;
    refresh();
  }, [id, refresh]);

  async function addComment() {
    if (!comment.trim()) return;
    await fetch(`${API_URL}/tasks/${id}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment }),
    });
    setComment("");
    await refresh();
  }

  async function saveTitle() {
    if (!editTitle.trim() || editTitle.trim() === task?.title) {
      setEditingTitle(false);
      return;
    }
    setSaving(true);
    await fetch(`${API_URL}/tasks/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim() }),
    });
    setSaving(false);
    setEditingTitle(false);
    await refresh();
  }

  async function saveDesc() {
    const next = editDesc.trim();
    if (next === (task?.description ?? "")) {
      setEditingDesc(false);
      return;
    }
    setSaving(true);
    await fetch(`${API_URL}/tasks/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: next || "" }),
    });
    setSaving(false);
    setEditingDesc(false);
    await refresh();
  }

  async function updateStatus(next: TaskStatus) {
    await fetch(`${API_URL}/tasks/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await refresh();
  }

  const activity = useMemo(() => {
    if (!task) return [];

    const items = [
      ...task.comments.map((c) => ({
        kind: "comment" as const,
        id: c.id,
        createdAt: c.createdAt,
        user: c.user,
        body: c.body,
      })),
      ...task.statusLogs.map((l) => ({
        kind: "status" as const,
        id: l.id,
        createdAt: l.createdAt,
        user: l.user,
        fromStatus: l.fromStatus,
        toStatus: l.toStatus,
      })),
    ];

    return items.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [task]);

  return (
    <main className="bb-container bb-page space-y-8">
      <PageHeader title={task?.title ?? "Task"} backHref="/" backLabel="← Back to tasks">
        {task ? (
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href={`/tasks/new?projectId=${task.project.id}&processId=${task.process.id}`}
              className="bb-admin-btn bb-admin-btn-outline"
            >
              Create similar task
            </Link>
            <div className="flex items-center gap-2">
              <span className="bb-admin-label">Assign to</span>
              <select
                className="bb-select bb-select--inline"
                value={task.assignedTo?.id ?? ""}
                onChange={async (e) => {
                  const val = e.target.value || null;
                  await fetch(`${API_URL}/tasks/${id}`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ assignedToId: val }),
                  });
                  await refresh();
                }}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="bb-admin-label">Status</span>
              <select
                className="bb-select bb-select--inline"
                value={status}
                onChange={(e) => {
                  const next = e.target.value as TaskStatus;
                  setStatus(next);
                  updateStatus(next);
                }}
              >
                {TASK_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </PageHeader>

      {error ? <div className="bb-alert-error">{error}</div> : null}

      {task ? (
        <>
          <div className="bb-admin-list-box">
            <div className="bb-admin-list-box-header">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="bb-admin-label">
                  {task.project.name} / {task.process.name}
                </div>
                {editingTitle ? (
                  <div className="flex gap-2 items-center mt-1">
                    <input
                      className="bb-admin-input !mt-0 flex-1"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitle();
                        if (e.key === "Escape") setEditingTitle(false);
                      }}
                      autoFocus
                      disabled={saving}
                    />
                    <button type="button" className="bb-admin-btn" onClick={saveTitle} disabled={saving}>
                      Save
                    </button>
                    <button
                      type="button"
                      className="bb-admin-btn bb-admin-btn-outline"
                      onClick={() => setEditingTitle(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <h2
                    className="bb-admin-list-box-title mt-1 bb-editable-text"
                    onClick={() => {
                      setEditTitle(task.title);
                      setEditingTitle(true);
                    }}
                    title="Click to edit title"
                  >
                    {task.title}
                  </h2>
                )}
                <span className="bb-task-number">#{task.taskNumber}</span>
              </div>
              <StatusBadge status={task.status} assignedTo={task.assignedTo} />
            </div>
            <div className="bb-admin-list-box-body" style={{ paddingTop: "1rem", paddingBottom: "1.25rem" }}>
              {editingDesc ? (
                <div>
                  <textarea
                    className="bb-textarea w-full"
                    rows={4}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    autoFocus
                    disabled={saving}
                  />
                  <div className="flex gap-2 mt-2">
                    <button type="button" className="bb-admin-btn" onClick={saveDesc} disabled={saving}>
                      Save
                    </button>
                    <button
                      type="button"
                      className="bb-admin-btn bb-admin-btn-outline"
                      onClick={() => setEditingDesc(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className="text-sm leading-relaxed bb-editable-text"
                  onClick={() => {
                    setEditDesc(task.description ?? "");
                    setEditingDesc(true);
                  }}
                  title="Click to edit description"
                >
                  {task.description || "No description — click to add one."}
                </p>
              )}
              <div className="mt-10" />
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="bb-admin-label">Created</div>
                  <div className="bb-admin-cell-date mt-1">{formatDateTime(task.createdAt)}</div>
                </div>
                <div>
                  <div className="bb-admin-label">Updated</div>
                  <div className="bb-admin-cell-date mt-1">{formatDateTime(task.updatedAt)}</div>
                </div>
                <div>
                  <div className="bb-admin-label">Created by</div>
                  <div className="bb-admin-cell-primary mt-1">{task.createdBy.name}</div>
                </div>
                <div>
                  <div className="bb-admin-label">Assigned to</div>
                  <div className="bb-admin-cell-primary mt-1">
                    {task.assignedTo ? task.assignedTo.name : "Unassigned"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bb-admin-list-box bb-task-comments-box">
            <div className="bb-admin-list-box-header">
              <h2 className="bb-admin-list-box-title">Comments</h2>
              <span className="bb-admin-label">{activity.length} total</span>
            </div>
            <div className="bb-admin-list-box-body" style={{ paddingTop: "0.5rem", paddingBottom: "1rem" }}>
              {activity.length === 0 ? (
                <p className="bb-admin-cell-empty">No comments or status changes yet.</p>
              ) : (
                activity.map((item) => (
                  <div key={`${item.kind}-${item.id}`} className="bb-comment-block">
                    <div className="bb-admin-cell-sub mb-1">
                      {item.user.name} • {formatDateTime(item.createdAt)}
                    </div>
                    {item.kind === "comment" ? (
                      <CommentBody body={item.body} users={users} />
                    ) : (
                      <p className="text-sm bb-admin-cell-secondary">
                        {formatTaskStatusLogLabel(item.fromStatus)} →{" "}
                        {formatTaskStatusLogLabel(item.toStatus)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="bb-admin-list-box-footer">
              <div className="flex gap-2">
                <CommentMentionInput
                  value={comment}
                  onChange={setComment}
                  users={users}
                  placeholder="Write a comment…"
                  onSubmit={addComment}
                />
                <button type="button" className="bb-admin-btn" onClick={addComment}>
                  Comment
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-body">
            <p className="bb-admin-cell-empty">Loading…</p>
          </div>
        </div>
      )}
    </main>
  );
}
