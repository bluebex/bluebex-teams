"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { TaskPublicId } from "@/components/TaskPublicId";
import { CommentBody } from "@/components/CommentBody";
import { CommentMentionInput } from "@/components/CommentMentionInput";
import { DatePicker } from "@/components/DatePicker";
import {
  formatTaskStatusLogLabel,
  TASK_STATUS_OPTIONS,
  type TaskStatus,
} from "@/lib/taskStatus";
import {
  formatTaskPriorityLogLabel,
  TASK_PRIORITY_OPTIONS,
  type TaskPriority,
} from "@/lib/taskPriority";
import {
  formatTaskCategoryLogLabel,
  TASK_CATEGORY_OPTIONS,
  type TaskCategory,
} from "@/lib/taskCategory";
import { formatTaskEtaLogLabel, toDateInputValue } from "@/lib/taskEta";
import { isTaskPublicId, normalizeTaskPublicId } from "@/lib/taskPublicId";
import { HotlistPicker } from "@/components/HotlistPicker";
import {
  formatHotlistChangeLogText,
  formatChangeFieldLabel,
  type HotlistLite,
} from "@/lib/hotlist";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type UserLite = { id: string; username: string; name: string };
type Task = {
  id: string;
  publicId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  eta: string | null;
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
  changeLogs: {
    id: string;
    field: string;
    fromValue: string | null;
    toValue: string | null;
    createdAt: string;
    user: UserLite;
  }[];
  hotlists: HotlistLite[];
};

function formatChangeText(value: string | null | undefined) {
  if (!value) return "";
  if (value.length > 100) return `${value.slice(0, 100)}…`;
  return value;
}

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
  const rawParam = typeof params.publicId === "string" ? params.publicId : "";
  const publicId = normalizeTaskPublicId(rawParam);
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [hotlists, setHotlists] = useState<HotlistLite[]>([]);
  const [selectedHotlistIds, setSelectedHotlistIds] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<TaskPriority>("P1");
  const [category, setCategory] = useState<TaskCategory>("TASK");
  const [eta, setEta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentSubmittingRef = useRef(false);

  const refresh = useMemo(
    () => async () => {
      const [taskRes, metaRes] = await Promise.all([
        fetch(`${API_URL}/tasks/${publicId}`, { credentials: "include" }),
        fetch(`${API_URL}/tasks/meta`, { credentials: "include" }),
      ]);
      if (taskRes.status === 401 || metaRes.status === 401) {
        return (window.location.href = "/login");
      }
      if (!taskRes.ok) return setError("Failed to load task");
      const taskData = await taskRes.json();
      setTask(taskData.task);
      setSelectedHotlistIds((taskData.task.hotlists || []).map((h: HotlistLite) => h.hotlistId));
      setStatus(taskData.task.status);
      setPriority(taskData.task.priority);
      setCategory(taskData.task.category);
      setEta(toDateInputValue(taskData.task.eta));
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        setUsers(metaData.users || []);
        setHotlists(metaData.hotlists || []);
      }
    },
    [publicId],
  );

  useEffect(() => {
    if (!publicId || !isTaskPublicId(publicId)) {
      setError("Task not found");
      return;
    }
    refresh();
  }, [publicId, refresh]);

  async function addComment() {
    const body = comment.trim();
    if (!body || commentSubmittingRef.current) return;

    commentSubmittingRef.current = true;
    setSubmittingComment(true);
    setComment("");

    try {
      await fetch(`${API_URL}/tasks/${publicId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      await refresh();
    } finally {
      commentSubmittingRef.current = false;
      setSubmittingComment(false);
    }
  }

  async function saveTitle() {
    if (!editTitle.trim() || editTitle.trim() === task?.title) {
      setEditingTitle(false);
      return;
    }
    setSaving(true);
    await fetch(`${API_URL}/tasks/${publicId}`, {
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
    const next = editDesc;
    const current = task?.description ?? "";
    if (next === current) {
      setEditingDesc(false);
      return;
    }
    setSaving(true);
    await fetch(`${API_URL}/tasks/${publicId}`, {
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
    await fetch(`${API_URL}/tasks/${publicId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await refresh();
  }

  async function updatePriority(next: TaskPriority) {
    await fetch(`${API_URL}/tasks/${publicId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: next }),
    });
    await refresh();
  }

  async function updateCategory(next: TaskCategory) {
    await fetch(`${API_URL}/tasks/${publicId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: next }),
    });
    await refresh();
  }

  async function updateHotlists(nextHotlistIds: string[]) {
    const previous = selectedHotlistIds;
    setSelectedHotlistIds(nextHotlistIds);
    const res = await fetch(`${API_URL}/tasks/${publicId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotlistIds: nextHotlistIds }),
    });
    if (!res.ok) {
      setSelectedHotlistIds(previous);
      setError("Failed to update hotlists");
      return;
    }
    setError(null);
    await refresh();
  }

  async function updateEta(next: string | null) {
    const previous = eta;
    setEta(next ?? "");
    const res = await fetch(`${API_URL}/tasks/${publicId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eta: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEta(previous);
      setError(data?.error || "Failed to update ETA");
      return;
    }
    setError(null);
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
      ...task.changeLogs
        .filter(
          (l) =>
            l.field === "title" ||
            l.field === "description" ||
            l.field === "priority" ||
            l.field === "category" ||
            l.field === "eta" ||
            l.field === "hotlist_add" ||
            l.field === "hotlist_remove",
        )
        .map((l) => ({
          kind: "change" as const,
          id: l.id,
          createdAt: l.createdAt,
          user: l.user,
          field: l.field,
          fromValue: l.fromValue,
          toValue: l.toValue,
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
          <div className="flex items-center gap-4 flex-wrap" style={{ width: "100%" }}>
            <Link
              href={`/tasks/new?projectId=${task.project.id}&processId=${task.process.id}&priority=${task.priority}&category=${task.category}`}
              className="bb-admin-btn bb-admin-btn-outline"
              style={{ marginRight: "auto" }}
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
                  await fetch(`${API_URL}/tasks/${publicId}`, {
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
                <TaskPublicId publicId={task.publicId} />
              </div>
              <StatusBadge status={task.status} assignedTo={task.assignedTo} />
              <CategoryBadge category={task.category} />
              <PriorityBadge priority={task.priority} />
            </div>
            <div className="bb-admin-list-box-body" style={{ paddingTop: "1rem", paddingBottom: "1.25rem" }}>
              {editingDesc ? (
                <div>
                  <textarea
                    className="bb-textarea w-full"
                    rows={6}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.stopPropagation();
                    }}
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
                  className="text-sm leading-relaxed bb-editable-text bb-preserve-lines"
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
                <div className="sm:col-span-2">
                  <HotlistPicker
                    hotlists={hotlists}
                    value={selectedHotlistIds}
                    onChange={(ids) => void updateHotlists(ids)}
                    onHotlistCreated={(hotlist) => {
                      setHotlists((prev) =>
                        [...prev, hotlist].sort((a, b) => a.name.localeCompare(b.name)),
                      );
                    }}
                    label="Hotlists"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bb-task-comments-section">
            <div className="bb-task-inline-actions">
              <div className="flex items-center gap-4 flex-wrap justify-end" style={{ width: "100%" }}>
                <div className="flex items-center gap-2">
                  <span className="bb-admin-label">Category</span>
                  <select
                    className="bb-select bb-select--inline"
                    value={category}
                    onChange={(e) => {
                      const next = e.target.value as TaskCategory;
                      setCategory(next);
                      updateCategory(next);
                    }}
                  >
                    {TASK_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bb-admin-label">Priority</span>
                  <select
                    className="bb-select bb-select--inline"
                    value={priority}
                    onChange={(e) => {
                      const next = e.target.value as TaskPriority;
                      setPriority(next);
                      updatePriority(next);
                    }}
                  >
                    {TASK_PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bb-admin-label">ETA</span>
                  <DatePicker
                    inline
                    value={eta}
                    placeholder="Set ETA"
                    onChange={(next) => {
                      setEta(next ?? "");
                      updateEta(next);
                    }}
                  />
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
                      {item.kind === "change"
                        ? ` · ${formatChangeFieldLabel(item.field)}`
                        : null}
                    </div>
                    {item.kind === "comment" ? (
                      <CommentBody body={item.body} users={users} />
                    ) : item.kind === "status" ? (
                      <p className="text-sm bb-admin-cell-secondary">
                        {formatTaskStatusLogLabel(item.fromStatus)} →{" "}
                        {formatTaskStatusLogLabel(item.toStatus)}
                      </p>
                    ) : item.field === "priority" ? (
                      <p className="text-sm bb-admin-cell-secondary">
                        {formatTaskPriorityLogLabel(item.fromValue)} →{" "}
                        {formatTaskPriorityLogLabel(item.toValue)}
                      </p>
                    ) : item.field === "category" ? (
                      <p className="text-sm bb-admin-cell-secondary">
                        {formatTaskCategoryLogLabel(item.fromValue)} →{" "}
                        {formatTaskCategoryLogLabel(item.toValue)}
                      </p>
                    ) : item.field === "eta" ? (
                      <p className="text-sm bb-admin-cell-secondary">
                        {formatTaskEtaLogLabel(item.fromValue)} →{" "}
                        {formatTaskEtaLogLabel(item.toValue)}
                      </p>
                    ) : item.field === "description" ? (
                      <p className="text-sm bb-admin-cell-secondary bb-preserve-lines">
                        {formatChangeText(item.fromValue)}
                        {formatChangeText(item.fromValue) ? " → " : "→ "}
                        {formatChangeText(item.toValue)}
                      </p>
                    ) : item.field === "hotlist_add" || item.field === "hotlist_remove" ? (
                      <p className="text-sm bb-admin-cell-secondary">
                        {formatHotlistChangeLogText(item.field, item.fromValue, item.toValue)}
                      </p>
                    ) : (
                      <p className="text-sm bb-admin-cell-secondary">
                        {formatChangeText(item.fromValue)}
                        {formatChangeText(item.fromValue) ? " → " : "→ "}
                        {formatChangeText(item.toValue)}
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
                  disabled={submittingComment}
                />
                <button
                  type="button"
                  className="bb-admin-btn"
                  disabled={submittingComment || !comment.trim()}
                  onClick={addComment}
                >
                  {submittingComment ? "Commenting…" : "Comment"}
                </button>
              </div>
            </div>
          </div>
          </div>
        </>
      ) : !error ? (
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-body">
            <p className="bb-admin-cell-empty">Loading…</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
