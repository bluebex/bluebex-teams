"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { TaskPublicId } from "@/components/TaskPublicId";
import { Pagination } from "@/components/Pagination";
import { MultiSelect } from "@/components/MultiSelect";
import { HotlistFilterSelect } from "@/components/HotlistFilterSelect";
import { DatePicker } from "@/components/DatePicker";
import {
  OPEN_TASK_STATUSES,
  TASK_STATUS_OPTIONS,
  type TaskStatus,
} from "@/lib/taskStatus";
import { taskPath } from "@/lib/taskPublicId";
import { TASK_PRIORITY_OPTIONS, type TaskPriority } from "@/lib/taskPriority";
import { TASK_CATEGORY_OPTIONS, type TaskCategory } from "@/lib/taskCategory";
import { formatTaskEta } from "@/lib/taskEta";
import { formatHotlistLabel, type HotlistLite } from "@/lib/hotlist";
import { isUnauthenticatedResponse, redirectToLogin } from "@/lib/authClient";

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
  category: TaskCategory;
  eta: string | null;
  updatedAt: string;
  assignedTo: UserLite | null;
  createdBy: UserLite;
  project: { id: string; name: string };
  process: { id: string; name: string };
  hotlists?: HotlistLite[];
};

type TaskPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type ProcessOption = { id: string; name: string };

type EtaFilterMode = "" | "none" | "date";

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
  /** When set, only tasks with these statuses are shown. Empty = no status filter. */
  defaultSelectedStatuses?: TaskStatus[];
};

const VIEW_TITLES: Record<string, string> = {
  assigned: "Assigned to me",
  created: "Created by me",
};

const NO_DEFAULT_STATUSES: TaskStatus[] = [];

function resolveDefaultStatuses(view: string, propDefaults: TaskStatus[]): TaskStatus[] {
  if (propDefaults.length > 0) return propDefaults;
  if (view === "assigned") return OPEN_TASK_STATUSES;
  return [];
}

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
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
  defaultSelectedStatuses = NO_DEFAULT_STATUSES,
}: TaskListViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = fixedCategory ? "" : (searchParams.get("view") ?? "");
  const urlProjectId = searchParams.get("projectId") ?? "";
  const urlProcessId = searchParams.get("processId") ?? "";
  const urlHotlistId = searchParams.get("hotlistId") ?? "";
  const urlAssignedToId = searchParams.get("assignedToId") ?? "";
  const defaultStatusesRef = useRef(defaultSelectedStatuses);
  defaultStatusesRef.current = defaultSelectedStatuses;

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [hotlists, setHotlists] = useState<HotlistLite[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>(() =>
    resolveDefaultStatuses(view, defaultSelectedStatuses),
  );
  const assignedToId =
    view === "assigned" && currentUser ? currentUser.id : urlAssignedToId;
  const [projectId, setProjectId] = useState(urlProjectId);
  const [processId, setProcessId] = useState(urlProcessId);
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [category, setCategory] = useState<TaskCategory | "">("");
  const [hotlistId, setHotlistId] = useState(urlHotlistId);
  const [etaMode, setEtaMode] = useState<EtaFilterMode>("");
  const [etaDate, setEtaDate] = useState("");
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
    if (
      selectedStatuses.length > 0 &&
      selectedStatuses.length < TASK_STATUS_OPTIONS.length
    ) {
      p.set("statusIn", selectedStatuses.join(","));
    }
    if (assignedToId && view !== "assigned") p.set("assignedToId", assignedToId);
    if (projectId) p.set("projectId", projectId);
    if (processId) p.set("processId", processId);
    if (priority) p.set("priority", priority);
    if (!fixedCategory && category) p.set("category", category);
    if (hotlistId) p.set("hotlistId", hotlistId);
    if (etaMode === "none") p.set("etaIsNull", "true");
    else if (etaMode === "date" && etaDate) p.set("eta", etaDate);
    if (search.trim()) p.set("search", search.trim());
    p.set("page", String(page));
    p.set("pageSize", String(TASKS_PAGE_SIZE));
    return `?${p.toString()}`;
  }, [view, fixedCategory, selectedStatuses, assignedToId, projectId, processId, priority, category, hotlistId, etaMode, etaDate, search, page]);

  const processOptions = useMemo((): ProcessOption[] => {
    if (!projectId) return [];
    const project = projects.find((p) => p.id === projectId);
    return (project?.processes ?? []).map((process) => ({
      id: process.id,
      name: process.name,
    }));
  }, [projects, projectId]);

  const assigneeOptions = useMemo(() => {
    const options = [...users];
    if (currentUser && !options.some((u) => u.id === currentUser.id)) {
      options.push(currentUser);
    }
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [users, currentUser]);

  useEffect(() => {
    if (!projectId && processId) {
      setProcessId("");
    }
  }, [projectId, processId]);

  useEffect(() => {
    if (!processId) return;
    if (!processOptions.some((process) => process.id === processId)) {
      setProcessId("");
    }
  }, [processOptions, processId]);

  const loadCurrentUser = useCallback(async () => {
    const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (isUnauthenticatedResponse(res.status, data.user)) return redirectToLogin();
    if (!res.ok) throw new Error("Failed to load user");
    setCurrentUser(data.user);
  }, []);

  const loadTasks = useCallback(async () => {
    const res = await fetch(`${API_URL}/tasks${qs}`, { credentials: "include" });
    if (res.status === 401) return redirectToLogin();
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
    if (res.status === 401) return redirectToLogin();
    if (!res.ok) throw new Error("Failed to load users");
    const data = await res.json();
    setUsers(data.users || []);
    setProjects(data.projects || []);
    setHotlists(data.hotlists || []);
  }, []);

  useEffect(() => {
    setSelectedStatuses(resolveDefaultStatuses(view, defaultStatusesRef.current));
    setProjectId(urlProjectId);
    setProcessId(urlProcessId);
    setHotlistId(urlHotlistId);
    setPage(1);
  }, [view, fixedCategory, urlProjectId, urlProcessId, urlHotlistId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([loadCurrentUser(), loadUsers()]);
      } catch {
        if (!cancelled) setError(errorMessage);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCurrentUser, loadUsers, errorMessage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        await loadTasks();
      } catch {
        if (!cancelled) setError(errorMessage);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadTasks, errorMessage]);

  const selectedHotlist = hotlists.find((h) => h.hotlistId === hotlistId);

  const pageTitle =
    pageTitleProp ??
    (fixedCategory === "BUG"
      ? "Bugs"
      : selectedHotlist
        ? selectedHotlist.name
        : VIEW_TITLES[view] ?? "Tasks");

  const pageSubtitle =
    pageSubtitleProp ??
    (fixedCategory === "BUG"
      ? "Track and manage reported bugs."
      : selectedHotlist
        ? `Tasks in hotlist ${selectedHotlist.hotlistId} that you can access.`
        : view === "assigned"
          ? "Tasks currently assigned to you."
          : view === "created"
            ? "Tasks you have created."
            : currentUser
              ? `Welcome, ${currentUser.name}. View and manage your work.`
              : "View and manage your tasks.");

  const isStatusFiltered =
    selectedStatuses.length > 0 &&
    selectedStatuses.length < TASK_STATUS_OPTIONS.length;

  const hasFilters = Boolean(
    isStatusFiltered ||
      assignedToId ||
      projectId ||
      processId ||
      priority ||
      category ||
      hotlistId ||
      etaMode === "none" ||
      (etaMode === "date" && etaDate) ||
      search.trim() ||
      view,
  );

  const handleAssigneeChange = (nextId: string) => {
    setPage(1);
    const params = new URLSearchParams(window.location.search);
    if (view === "assigned") params.delete("view");
    if (nextId) params.set("assignedToId", nextId);
    else params.delete("assignedToId");
    const nextQs = params.toString();
    const basePath = pathname || "/";
    router.replace(nextQs ? `${basePath}?${nextQs}` : basePath);
  };

  const handleStatusChange = (statuses: TaskStatus[]) => {
    setSelectedStatuses(statuses);
    setPage(1);
  };

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

          <div className="bb-task-filter-rows">
            <div className="bb-task-filter-row">
              <MultiSelect
                label="Status"
                options={TASK_STATUS_OPTIONS}
                value={selectedStatuses}
                onChange={handleStatusChange}
              />

              <label className="bb-task-filter-field">
                <span className="bb-admin-label">Priority</span>
                <select
                  className="bb-select"
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value as TaskPriority | "");
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {TASK_PRIORITY_OPTIONS.map((opt) => (
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
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                >
                  <option value="">Anyone</option>
                  {assigneeOptions.map((u) => (
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
                    const nextProjectId = e.target.value;
                    setProjectId(nextProjectId);
                    setProcessId("");
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

            <div className="bb-task-filter-row">
              <label className="bb-task-filter-field">
                <span className="bb-admin-label">Process</span>
                <select
                  className="bb-select"
                  value={processId}
                  disabled={!projectId}
                  onChange={(e) => {
                    setProcessId(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {processOptions.map((process) => (
                    <option key={process.id} value={process.id}>
                      {process.name}
                    </option>
                  ))}
                </select>
              </label>

              <HotlistFilterSelect
                hotlists={hotlists}
                value={hotlistId}
                onChange={(next) => {
                  setHotlistId(next);
                  setPage(1);
                }}
                onHotlistCreated={(hotlist) => {
                  setHotlists((prev) =>
                    [...prev, hotlist].sort((a, b) => a.name.localeCompare(b.name)),
                  );
                }}
              />

              {!fixedCategory ? (
                <label className="bb-task-filter-field">
                  <span className="bb-admin-label">Type</span>
                  <select
                    className="bb-select"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value as TaskCategory | "");
                      setPage(1);
                    }}
                  >
                    <option value="">All</option>
                    {TASK_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="bb-task-filter-field">
                <span className="bb-admin-label">ETA</span>
                <select
                  className="bb-select"
                  value={etaMode}
                  onChange={(e) => {
                    const next = e.target.value as EtaFilterMode;
                    setEtaMode(next);
                    if (next !== "date") setEtaDate("");
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  <option value="none">No ETA</option>
                  <option value="date">On date</option>
                </select>
                {etaMode === "date" ? (
                  <DatePicker
                    value={etaDate}
                    allowAnyDate
                    placeholder="Pick date"
                    onChange={(next) => {
                      setEtaDate(next ?? "");
                      setPage(1);
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="bb-admin-list-box-body">
          {tasks.length === 0 ? (
            <p className="bb-admin-cell-empty">
              {hasFilters
                ? `No ${emptyLabel} match your filters.`
                : `No ${emptyLabel} yet.`}{" "}
              <Link className="bb-text-link" href={createHref}>
                Create one
              </Link>
            </p>
          ) : (
            <ul className="bb-task-list">
              {tasks.map((t) => {
                const href = taskPath(t.publicId);
                const taskHotlists = t.hotlists ?? [];
                return (
                  <li
                    key={t.id}
                    className="bb-task-item"
                    onClick={() => router.push(href)}
                  >
                    <div className="bb-task-item-main">
                      <div className="bb-task-item-heading">
                        <div className="bb-task-item-heading-text">
                          <Link
                            href={href}
                            className="bb-task-item-title"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t.title}
                          </Link>
                          <div
                            className={`bb-task-item-assignee${
                              t.assignedTo ? "" : " bb-task-item-assignee--empty"
                            }`}
                          >
                            {t.assignedTo ? t.assignedTo.name : "Unassigned"}
                          </div>
                        </div>
                        <div className="bb-task-item-badges">
                          {!fixedCategory ? (
                            <CategoryBadge category={t.category} />
                          ) : null}
                          <PriorityBadge priority={t.priority} />
                          <StatusBadge status={t.status} assignedTo={t.assignedTo} />
                        </div>
                      </div>

                      <div className="bb-task-item-meta">
                        <TaskPublicId publicId={t.publicId} inline />
                        <span className="bb-task-meta-sep">·</span>
                        <span>
                          {t.project.name}
                          <span className="bb-task-meta-sep"> / </span>
                          {t.process.name}
                        </span>
                        <span className="bb-task-meta-sep">·</span>
                        <span>ETA {formatTaskEta(t.eta)}</span>
                        <span className="bb-task-meta-sep">·</span>
                        <span>Updated {formatUpdatedAt(t.updatedAt)}</span>
                        <span className="bb-task-meta-sep">·</span>
                        <span>by {t.createdBy.name}</span>
                      </div>

                      {taskHotlists.length > 0 ? (
                        <div className="bb-task-row-hotlists">
                          {taskHotlists.slice(0, 4).map((hotlist) => (
                            <Link
                              key={hotlist.id}
                              href={`/?hotlistId=${hotlist.hotlistId}`}
                              className="bb-task-hotlist-chip"
                              title={formatHotlistLabel(hotlist)}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {hotlist.name}
                            </Link>
                          ))}
                          {taskHotlists.length > 4 ? (
                            <span className="bb-task-hotlist-more">
                              +{taskHotlists.length - 4}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
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
