"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { DatePicker } from "@/components/DatePicker";
import { TASK_PRIORITY_OPTIONS, parseTaskPriority, type TaskPriority } from "@/lib/taskPriority";
import { TASK_CATEGORY_OPTIONS, parseTaskCategory, type TaskCategory } from "@/lib/taskCategory";
import { capitalizeFirstLetter } from "@/lib/format";
import { HotlistPicker } from "@/components/HotlistPicker";
import { type HotlistLite } from "@/lib/hotlist";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type UserLite = { id: string; username: string; name: string };
type ProjectOption = { id: string; name: string; processes: { id: string; name: string }[] };

export default function NewTaskPage() {
  return (
    <Suspense>
      <NewTaskContent />
    </Suspense>
  );
}

function NewTaskContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preProjectId = searchParams.get("projectId") ?? "";
  const preProcessId = searchParams.get("processId") ?? "";
  const prePriority = parseTaskPriority(searchParams.get("priority"));
  const preCategory = parseTaskCategory(searchParams.get("category"));
  const isBugForm = preCategory === "BUG";
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [hotlists, setHotlists] = useState<HotlistLite[]>([]);
  const [hotlistIds, setHotlistIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [newTask, setNewTask] = useState({
    projectId: "",
    processId: "",
    title: "",
    description: "",
    assignedToId: "",
    priority: prePriority ?? "P1",
    category: preCategory ?? "TASK",
    eta: "",
  });

  const newTaskProcesses = useMemo(() => {
    if (!newTask.projectId) return [];
    return projects.find((p) => p.id === newTask.projectId)?.processes ?? [];
  }, [newTask.projectId, projects]);

  const loadMeta = useCallback(async () => {
    const res = await fetch(`${API_URL}/tasks/meta`, { credentials: "include" });
    if (res.status === 401) return (window.location.href = "/login");
    if (!res.ok) throw new Error("Failed to load task options");
    const data = await res.json();
    const loadedProjects: ProjectOption[] = data.projects || [];
    setProjects(loadedProjects);
    setUsers(data.users || []);
    setHotlists(data.hotlists || []);
    if (preProjectId) {
      const proj = loadedProjects.find((p) => p.id === preProjectId);
      if (proj) {
        const autoProcessId = preProcessId && proj.processes.some((pr) => pr.id === preProcessId)
          ? preProcessId
          : proj.processes.length === 1
            ? proj.processes[0].id
            : "";
        setNewTask((prev) => ({
          ...prev,
          projectId: preProjectId,
          processId: autoProcessId,
          ...(prePriority ? { priority: prePriority } : {}),
          ...(preCategory ? { category: preCategory } : {}),
        }));
      }
    } else if (prePriority || preCategory) {
      setNewTask((prev) => ({
        ...prev,
        ...(prePriority ? { priority: prePriority } : {}),
        ...(preCategory ? { category: preCategory } : {}),
      }));
    }
  }, [preProjectId, preProcessId, prePriority, preCategory]);

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        await loadMeta();
      } catch {
        setError("Failed to load form options");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMeta]);

  async function createTask() {
    setError(null);
    if (!newTask.title.trim() || !newTask.processId) {
      setError("Title and process are required.");
      return;
    }
    const title = capitalizeFirstLetter(newTask.title.trim());
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: newTask.description || undefined,
          processId: newTask.processId,
          assignedToId: newTask.assignedToId || undefined,
          priority: newTask.priority,
          category: newTask.category,
          ...(newTask.eta ? { eta: newTask.eta } : {}),
          ...(hotlistIds.length > 0 ? { hotlistIds } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || `Failed to create task (${res.status})`);
        return;
      }
      const data = await res.json();
      router.push(`/${data.task.publicId}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bb-container bb-page space-y-8 max-w-2xl">
      <PageHeader
        title={isBugForm ? "Create bug" : "Create task"}
        subtitle={
          isBugForm
            ? "Report a new bug in a project process."
            : "Add a new task to a project process."
        }
        backHref={isBugForm ? "/bugs" : "/"}
        backLabel={isBugForm ? "← Back to bugs" : "← Back to tasks"}
      />

      <div className="bb-admin-list-box">
        <div className="bb-admin-list-box-header">
          <h2 className="bb-admin-list-box-title">Task details</h2>
        </div>
        <div className="bb-admin-list-box-body" style={{ paddingTop: "1rem", paddingBottom: "1.25rem" }}>
          {loading ? (
            <p className="text-sm opacity-70">Loading…</p>
          ) : projects.length === 0 ? (
            <p className="text-sm opacity-70">
              No projects available. Ask an admin to grant you project access first.
            </p>
          ) : (
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="bb-admin-label">Project</span>
                <select
                  className="bb-select"
                  value={newTask.projectId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const procs = projects.find((p) => p.id === pid)?.processes ?? [];
                    setNewTask({
                      ...newTask,
                      projectId: pid,
                      processId: procs.length === 1 ? procs[0].id : "",
                    });
                  }}
                >
                  <option value="">Select project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="bb-admin-label">Process</span>
                <select
                  className="bb-select"
                  value={newTask.processId}
                  disabled={!newTask.projectId || newTaskProcesses.length === 0}
                  onChange={(e) => setNewTask({ ...newTask, processId: e.target.value })}
                >
                  <option value="">
                    {!newTask.projectId
                      ? "Select a project first"
                      : newTaskProcesses.length === 0
                        ? "No processes available"
                        : "Select process"}
                  </option>
                  {newTaskProcesses.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="bb-admin-label">Title</span>
                <input
                  className="bb-input"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: capitalizeFirstLetter(e.target.value) })
                  }
                  placeholder="What needs to be done?"
                />
              </label>

              <label className="block text-sm">
                <span className="bb-admin-label">Description (optional)</span>
                <textarea
                  className="bb-textarea"
                  rows={6}
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.stopPropagation();
                  }}
                  placeholder="Add more details…"
                />
              </label>

              <HotlistPicker
                hotlists={hotlists}
                value={hotlistIds}
                onChange={setHotlistIds}
                onHotlistCreated={(hotlist) => {
                  setHotlists((prev) =>
                    [...prev, hotlist].sort((a, b) => a.name.localeCompare(b.name)),
                  );
                }}
                label="Hotlist (optional)"
              />

              <div className="bb-task-filter-row">
                <label className="bb-task-filter-field text-sm">
                  <span className="bb-admin-label">Category</span>
                  <select
                    className="bb-select"
                    value={newTask.category}
                    onChange={(e) =>
                      setNewTask({ ...newTask, category: e.target.value as TaskCategory })
                    }
                  >
                    {TASK_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="bb-task-filter-field text-sm">
                  <span className="bb-admin-label">Priority</span>
                  <select
                    className="bb-select"
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({ ...newTask, priority: e.target.value as TaskPriority })
                    }
                  >
                    {TASK_PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="bb-task-filter-field text-sm">
                  <span className="bb-admin-label">ETA (optional)</span>
                  <DatePicker
                    value={newTask.eta}
                    placeholder="Pick a date"
                    onChange={(next) => setNewTask({ ...newTask, eta: next ?? "" })}
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="bb-admin-label">Assign to (optional)</span>
                <select
                  className="bb-select"
                  value={newTask.assignedToId}
                  onChange={(e) => setNewTask({ ...newTask, assignedToId: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.username})
                    </option>
                  ))}
                </select>
              </label>

              {error ? <div className="bb-alert-error">{error}</div> : null}

              <button
                type="button"
                className="bb-admin-btn"
                disabled={submitting || !newTask.title.trim() || !newTask.processId}
                onClick={createTask}
              >
                {submitting ? "Creating…" : "Create task"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
