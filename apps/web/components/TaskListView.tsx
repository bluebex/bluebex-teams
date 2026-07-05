"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Pagination } from "@/components/Pagination";
import { TASK_STATUS_OPTIONS, type TaskStatus } from "@/lib/taskStatus";
import { taskPath } from "@/lib/taskPublicId";
import { type TaskPriority } from "@/lib/taskPriority";
import { type TaskCategory } from "@/lib/taskCategory";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TASKS_PAGE_SIZE = 20;

type UserLite = { id: string; username: string; name: string };
type ProjectMeta = { id: string; name: string; processes: { id: string; name: string }[] };
type CurrentUser = UserLite & { role: "ADMIN" | "USER" };
type TaskLite = {
  id: string;
  publicId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  updatedAt: string;
  assignedTo: UserLite | null;
  createdBy: UserLite;
  project: { id: string; name: string };
  process: { id: string; name: string };
};

type TaskPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type TaskListViewProps = {
  fixedCategory?: TaskCategory;
  pageTitle?: string;
  pageSubtitle?: string;
  listTitle?: string;
  createHref?: string;
  createLabel?: string;
  itemLabel?: string;
  emptyLabel?: string;
  errorMessage?: string;
};

const VIEW_TITLES: Record<string, string> = {
  assigned: "Assigned to me",
  created: "Created by me",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TaskListView({
  fixedCategory,
  pageTitle: pageTitleProp,
  pageSubtitle: pageSubtitleProp,
  listTitle = "Task list",
  createHref = "/tasks/new",
  createLabel = "Create task",
  itemLabel = "Task",
  emptyLabel = "tasks",
  errorMessage = "Failed to load tasks",
}: TaskListViewProps) {
  const searchParams = useSearchParams();
  const view = fixedCategory ? "" : (searchParams.get("view") ?? "");

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [assignedToId, setAssignedToId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<TaskPagination>({
    page: 1,
    pageSize: TASKS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (view) p.set("view", view);
    if (fixedCategory) p.set("category", fixedCategory);
    if (status) p.set("status", status);
    if (assignedToId) p.set("assignedToId", assignedToId);
    if (projectId) p.set("projectId", projectId);
    if (search.trim()) p.set("search", search.trim());
    p.set("page", String(page));
    p.set("pageSize", String(TASKS_PAGE_SIZE));
    return `?${p.toString()}`;
  }, [view, fixedCategory, status, assignedToId, projectId, search, page]);

  const loadCurrentUser = useCallback(async () => {
    const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
    if (res.status === 401) return (window.location.href = "/login");
    if (!res.ok) throw new Error("Failed to load user");
    const data = await res.json();
    if (!data.user) return (window.location.href = "/login");
    setCurrentUser(data.user);
  }, []);

  const loadTasks = useCallback(async () => {
    const res = await fetch(`${API_URL}/tasks${qs}`, { credentials: "include" });
    if (res.status === 401) return (window.location.href = "/login");
    if (!res.ok) throw new Error("Failed to load tasks");
    const data = await res.json();
    setTasks(data.tasks || []);
    if (data.pagination) {
      setPagination(data.pagination);
      if (data.pagination.page !== page) setPage(data.pagination.page);
    }
  }, [qs, page]);

  const loadUsers = useCallback(async () => {
    const res = await fetch(`${API_URL}/tasks/meta`, { credentials: "include" });
    if (res.status === 401) return (window.location.href = "/login");
    if (!res.ok) throw new Error("Failed to load users");
    const data = await res.json();
    setUsers(data.users || []);
    setProjects(data.projects || []);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [view, fixedCategory]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        await Promise.all([loadCurrentUser(), loadTasks(), loadUsers()]);
      } catch {
        if (!cancelled) setError(errorMessage);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCurrentUser, loadTasks, loadUsers, errorMessage]);

  const pageTitle =
    pageTitleProp ?? (fixedCategory === "BUG" ? "Bugs" : VIEW_TITLES[view] ?? "Tasks");

  const pageSubtitle =
    pageSubtitleProp ??
    (fixedCategory === "BUG"
      ? "Track and manage reported bugs."
      : view === "assigned"
        ? "Tasks currently assigned to you."
        : view === "created"
          ? "Tasks you have created."
          : currentUser
            ? `Welcome, ${currentUser.name}. View and manage your work.`
            : "View and manage your tasks.");

  const hasFilters = Boolean(status || assignedToId || projectId || search.trim() || view);

  return (
    <main className="bb-container bb-page space-y-8">
      <PageHeader title={pageTitle} subtitle={pageSubtitle}>
        <Link className="bb-admin-btn" href={createHref}>
          {createLabel}
        </Link>
      </PageHeader>

      {error ? <div className="bb-alert-error">{error}</div> : null}

      <div className="bb-admin-list-box">
        <div className="bb-admin-list-box-header">
          <h2 className="bb-admin-list-box-title">{listTitle}</h2>
          <span className="bb-admin-label">{pagination.total} total</span>
        </div>

        <div className="bb-task-filters">
          <label className="bb-task-search-main">
            <span className="bb-admin-label">Search</span>
            <input
              type="search"
              className="bb-admin-input"
              placeholder="Search by title or description…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>

          <div className="bb-task-filter-row">
            <label className="bb-task-filter-field">
              <span className="bb-admin-label">Status</span>
              <select
                className="bb-select"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as TaskStatus | "");
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {TASK_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="bb-task-filter-field">
              <span className="bb-admin-label">Assignee</span>
              <select
                className="bb-select"
                value={assignedToId}
                onChange={(e) => {
                  setAssignedToId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Anyone</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="bb-task-filter-field">
              <span className="bb-admin-label">Project</span>
              <select
                className="bb-select"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="bb-admin-list-box-body">
          <table className="bb-admin-table">
            <thead>
              <tr>
                <th>{itemLabel}</th>
                <th>Project</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="bb-admin-cell-empty">
                    {hasFilters
                      ? `No ${emptyLabel} match your filters.`
                      : `No ${emptyLabel} yet.`}{" "}
                    <Link className="bb-text-link" href={createHref}>
                      Create one
                    </Link>
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link href={taskPath(t.publicId)} className="bb-admin-cell-primary hover:underline">
                        {t.title}
                      </Link>
                      <span className="bb-admin-cell-sub">Created by {t.createdBy.name}</span>
                    </td>
                    <td>
                      <span className="bb-admin-cell-primary">{t.project.name}</span>
                      <span className="bb-admin-cell-sub">{t.process.name}</span>
                    </td>
                    <td>
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="bb-admin-cell-secondary">
                      {t.assignedTo ? t.assignedTo.name : "Unassigned"}
                    </td>
                    <td>
                      <StatusBadge status={t.status} assignedTo={t.assignedTo} />
                    </td>
                    <td className="bb-admin-cell-date">{formatDate(t.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bb-admin-list-box-footer">
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </main>
  );
}
