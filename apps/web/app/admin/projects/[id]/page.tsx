"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminModal } from "@/components/AdminModal";
import { AdminIconButton, DeleteIcon, EditIcon } from "@/components/AdminIconButton";
import { PriorityBadge } from "@/components/PriorityBadge";
import { TaskPublicId } from "@/components/TaskPublicId";
import type { TaskPriority } from "@/lib/taskPriority";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type ModalType =
  | "addProcess"
  | "editProcess"
  | "deleteProcess"
  | "addAccess"
  | "removeAccess"
  | "deleteTask"
  | null;

type User = { id: string; username: string; name: string; role: "ADMIN" | "USER" };
type ProcessMember = { user: User };
type Process = {
  id: string;
  name: string;
  members: ProcessMember[];
  _count: { tasks: number };
};
type Project = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  processes: Process[];
  members: { userId: string; createdAt: string; user: User }[];
  _count: { tasks: number };
};
type ProjectMembership = {
  userId: string;
  userName: string;
  username: string;
  projectId: string;
  projectName: string;
  createdAt: string;
};
type ProcessMembership = {
  userId: string;
  userName: string;
  username: string;
  processId: string;
  processName: string;
  projectId: string;
  projectName: string;
  createdAt: string;
};

type Task = {
  id: string;
  publicId: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: TaskPriority;
  createdAt: string;
  createdBy: { id: string; name: string; username: string };
  assignedTo: { id: string; name: string; username: string } | null;
  process: { id: string; name: string };
};

type AccessToRemove =
  | { scope: "project"; userId: string; userName: string; username: string }
  | {
      scope: "process";
      userId: string;
      userName: string;
      username: string;
      processId: string;
      processName: string;
    };

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ProjectDetailPage() {
  const { id: projectId } = useParams<{ id: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [projectMemberships, setProjectMemberships] = useState<ProjectMembership[]>([]);
  const [processMemberships, setProcessMemberships] = useState<ProcessMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newProcessName, setNewProcessName] = useState("");
  const [editProcess, setEditProcess] = useState({ id: "", name: "" });
  const [processToDelete, setProcessToDelete] = useState<Process | null>(null);
  const [accessForm, setAccessForm] = useState({ userId: "", scope: "project" as "project" | "process", processIds: [] as string[] });
  const [accessToRemove, setAccessToRemove] = useState<AccessToRemove | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  async function load() {
    setErr(null);
    try {
      const [pRes, uRes, mRes, tRes] = await Promise.all([
        fetch(`${API_URL}/admin/projects/${projectId}`, { credentials: "include" }),
        fetch(`${API_URL}/admin/users`, { credentials: "include" }),
        fetch(`${API_URL}/admin/memberships`, { credentials: "include" }),
        fetch(`${API_URL}/admin/projects/${projectId}/tasks`, { credentials: "include" }),
      ]);
      if (pRes.status === 401) return (window.location.href = "/login");
      if (pRes.status === 403 || uRes.status === 403 || mRes.status === 403)
        return setErr("Admin only.");
      if (pRes.status === 404) return setErr("Project not found.");
      if (!pRes.ok || !uRes.ok || !mRes.ok) return setErr("Failed to load data.");
      const pd = await pRes.json();
      const ud = await uRes.json();
      const md = await mRes.json();
      const td = tRes.ok ? await tRes.json() : { tasks: [] };
      setProject(pd.project || null);
      setUsers(ud.users || []);
      setTasks(td.tasks || []);
      setProjectMemberships(
        (md.projectMemberships || []).filter((m: ProjectMembership) => m.projectId === projectId),
      );
      setProcessMemberships(
        (md.processMemberships || []).filter((m: ProcessMembership) => m.projectId === projectId),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (projectId) load();
  }, [projectId]);

  const totalAccess = projectMemberships.length + processMemberships.length;

  const userHasProjectAccess = useMemo(() => {
    if (!accessForm.userId) return false;
    return projectMemberships.some((m) => m.userId === accessForm.userId);
  }, [accessForm.userId, projectMemberships]);

  const existingProcessAccessIds = useMemo(
    () =>
      new Set(
        processMemberships
          .filter((m) => m.userId === accessForm.userId)
          .map((m) => m.processId),
      ),
    [processMemberships, accessForm.userId],
  );

  const availableProcesses = useMemo(() => {
    if (!project || userHasProjectAccess) return [];
    return project.processes.filter((pr) => !existingProcessAccessIds.has(pr.id));
  }, [project, userHasProjectAccess, existingProcessAccessIds]);

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `Request failed (${res.status})`);
    }
  }

  async function patchJson(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `Request failed (${res.status})`);
    }
  }

  async function deleteJson(url: string) {
    const res = await fetch(url, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `Request failed (${res.status})`);
    }
  }

  function openModal(type: ModalType) {
    setModal(type);
    setModalErr(null);
    setErr(null);
    setMsg(null);
  }

  function closeModal() {
    setModal(null);
    setModalErr(null);
    setSubmitting(false);
    setAccessToRemove(null);
    setProcessToDelete(null);
    setTaskToDelete(null);
  }

  function openAddProcess() {
    setNewProcessName("");
    openModal("addProcess");
  }

  function openEditProcess(process: Process) {
    setEditProcess({ id: process.id, name: process.name });
    openModal("editProcess");
  }

  function openDeleteProcess(process: Process) {
    setProcessToDelete(process);
    openModal("deleteProcess");
  }

  function openAddAccess() {
    setAccessForm({ userId: "", scope: "project", processIds: [] });
    openModal("addAccess");
  }

  function openRemoveAccess(access: AccessToRemove) {
    setAccessToRemove(access);
    openModal("removeAccess");
  }

  function openDeleteTask(task: Task) {
    setTaskToDelete(task);
    openModal("deleteTask");
  }

  function toggleAccessProcess(processId: string) {
    setAccessForm((current) => ({
      ...current,
      processIds: current.processIds.includes(processId)
        ? current.processIds.filter((id) => id !== processId)
        : [...current.processIds, processId],
    }));
  }

  if (loading) {
    return (
      <main className="bb-container bb-page">
        <p className="text-sm opacity-60">Loading…</p>
      </main>
    );
  }

  if (err && !project) {
    return (
      <main className="bb-container bb-page space-y-6">
        <Link href="/admin/projects" className="text-sm opacity-60 hover:opacity-100">
          ← Back to projects
        </Link>
        <div className="text-sm text-red-700 border-l-2 border-red-700 pl-3">{err}</div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="bb-container bb-page space-y-6">
        <Link href="/admin/projects" className="text-sm opacity-60 hover:opacity-100">
          ← Back to projects
        </Link>
        <div className="text-sm text-red-700 border-l-2 border-red-700 pl-3">
          Project not found.
        </div>
      </main>
    );
  }

  return (
    <main className="bb-container bb-page space-y-16">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-4">
          <Link href="/admin/projects" className="text-sm opacity-60 hover:opacity-100">
            ← Back to projects
          </Link>
          <h1 className="bb-admin-title">{project.name}</h1>
          {project.description ? (
            <p className="text-sm max-w-lg opacity-60 leading-relaxed">{project.description}</p>
          ) : null}
        </div>
        <div className="flex gap-8 text-sm">
          <div>
            <div className="bb-admin-label">Processes</div>
            <div className="text-2xl font-medium mt-1 tabular-nums">
              {project.processes.length}
            </div>
          </div>
          <div>
            <div className="bb-admin-label">Members</div>
            <div className="text-2xl font-medium mt-1 tabular-nums">{totalAccess}</div>
          </div>
          <div>
            <div className="bb-admin-label">Tasks</div>
            <div className="text-2xl font-medium mt-1 tabular-nums">
              {project._count.tasks}
            </div>
          </div>
        </div>
      </header>

      {err ? (
        <div className="text-sm text-red-700 border-l-2 border-red-700 pl-3">{err}</div>
      ) : null}
      {msg ? (
        <div className="text-sm opacity-70 border-l-2 border-foreground pl-3">{msg}</div>
      ) : null}

      {/* Processes section */}
      <section className="space-y-6">
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-header">
            <h2 className="bb-admin-list-box-title">Processes</h2>
            <span className="bb-admin-label">{project.processes.length} total</span>
          </div>
          <div className="bb-admin-list-box-body">
            <table className="bb-admin-table">
              <thead>
                <tr>
                  <th>Process name</th>
                  <th>Tasks</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {project.processes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="bb-admin-cell-empty">
                      No processes yet.
                    </td>
                  </tr>
                ) : (
                  project.processes.map((pr) => (
                    <tr key={pr.id}>
                      <td className="bb-admin-cell-primary">{pr.name}</td>
                      <td className="bb-admin-cell-secondary">{pr._count.tasks}</td>
                      <td>
                        <div className="bb-admin-row-actions">
                          <AdminIconButton
                            label="Edit process"
                            onClick={() => openEditProcess(pr)}
                          >
                            <EditIcon />
                          </AdminIconButton>
                          <AdminIconButton
                            label="Delete process"
                            variant="danger"
                            onClick={() => openDeleteProcess(pr)}
                          >
                            <DeleteIcon />
                          </AdminIconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bb-admin-list-box-footer">
            <button type="button" className="bb-admin-btn" onClick={openAddProcess}>
              Add process
            </button>
          </div>
        </div>
      </section>

      {/* Tasks section */}
      <section className="space-y-6">
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-header">
            <h2 className="bb-admin-list-box-title">Tasks</h2>
            <span className="bb-admin-label">{tasks.length} total</span>
          </div>
          <div className="bb-admin-list-box-body">
            <table className="bb-admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Process</th>
                  <th>Assigned to</th>
                  <th>Created by</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="bb-admin-cell-empty">
                      No tasks yet.
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <TaskPublicId publicId={t.publicId} inline />
                      </td>
                      <td className="bb-admin-cell-primary">{t.title}</td>
                      <td>
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td>
                        <span className="bb-admin-badge">
                          {t.status === "IN_PROGRESS" ? "In Progress" : t.status === "TODO" ? "To Do" : "Done"}
                        </span>
                      </td>
                      <td className="bb-admin-cell-secondary">{t.process.name}</td>
                      <td className="bb-admin-cell-secondary">
                        {t.assignedTo ? t.assignedTo.name : "—"}
                      </td>
                      <td className="bb-admin-cell-secondary">{t.createdBy.name}</td>
                      <td className="bb-admin-cell-date">{formatDate(t.createdAt)}</td>
                      <td>
                        <div className="bb-admin-row-actions">
                          <AdminIconButton
                            label="Delete task"
                            variant="danger"
                            onClick={() => openDeleteTask(t)}
                          >
                            <DeleteIcon />
                          </AdminIconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* People / Access section */}
      <section className="space-y-6 pb-8">
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-header">
            <h2 className="bb-admin-list-box-title">People &amp; access</h2>
            <span className="bb-admin-label">{totalAccess} total</span>
          </div>
          <div className="bb-admin-list-box-body">
            <table className="bb-admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Scope</th>
                  <th>Process</th>
                  <th>Added</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {totalAccess === 0 ? (
                  <tr>
                    <td colSpan={5} className="bb-admin-cell-empty">
                      No one has access yet.
                    </td>
                  </tr>
                ) : (
                  <>
                    {projectMemberships.map((m) => (
                      <tr key={`p-${m.userId}`}>
                        <td className="bb-admin-cell-primary">
                          {m.userName}
                          <span className="bb-admin-cell-sub">{m.username}</span>
                        </td>
                        <td>
                          <span className="bb-admin-badge">Project</span>
                        </td>
                        <td className="bb-admin-cell-secondary">All processes</td>
                        <td className="bb-admin-cell-date">{formatDate(m.createdAt)}</td>
                        <td>
                          <div className="bb-admin-row-actions">
                            <AdminIconButton
                              label="Remove access"
                              variant="danger"
                              onClick={() =>
                                openRemoveAccess({
                                  scope: "project",
                                  userId: m.userId,
                                  userName: m.userName,
                                  username: m.username,
                                })
                              }
                            >
                              <DeleteIcon />
                            </AdminIconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {processMemberships.map((m) => (
                      <tr key={`r-${m.userId}-${m.processId}`}>
                        <td className="bb-admin-cell-primary">
                          {m.userName}
                          <span className="bb-admin-cell-sub">{m.username}</span>
                        </td>
                        <td>
                          <span className="bb-admin-badge">Process</span>
                        </td>
                        <td className="bb-admin-cell-secondary">{m.processName}</td>
                        <td className="bb-admin-cell-date">{formatDate(m.createdAt)}</td>
                        <td>
                          <div className="bb-admin-row-actions">
                            <AdminIconButton
                              label="Remove access"
                              variant="danger"
                              onClick={() =>
                                openRemoveAccess({
                                  scope: "process",
                                  userId: m.userId,
                                  userName: m.userName,
                                  username: m.username,
                                  processId: m.processId,
                                  processName: m.processName,
                                })
                              }
                            >
                              <DeleteIcon />
                            </AdminIconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
          <div className="bb-admin-list-box-footer">
            <button type="button" className="bb-admin-btn" onClick={openAddAccess}>
              Add access
            </button>
          </div>
        </div>
      </section>

      {/* Add process modal */}
      <AdminModal
        open={modal === "addProcess"}
        title="Add process"
        onClose={closeModal}
        footer={
          <>
            <button
              type="button"
              className="bb-admin-btn bb-admin-btn-outline"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bb-admin-btn"
              disabled={submitting || !newProcessName.trim()}
              onClick={async () => {
                setModalErr(null);
                setSubmitting(true);
                try {
                  await postJson(
                    `${API_URL}/admin/projects/${projectId}/processes`,
                    { name: newProcessName },
                  );
                  setMsg("Process created.");
                  closeModal();
                  await load();
                } catch (e) {
                  setModalErr(e instanceof Error ? e.message : "Failed to create process");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Saving…" : "Add process"}
            </button>
          </>
        }
      >
        <label className="block text-sm">
          <span className="bb-admin-label">Process name</span>
          <input
            className="bb-admin-input"
            value={newProcessName}
            onChange={(e) => setNewProcessName(e.target.value)}
          />
        </label>
        {modalErr ? <div className="text-sm text-red-700 mt-4">{modalErr}</div> : null}
      </AdminModal>

      {/* Edit process modal */}
      <AdminModal
        open={modal === "editProcess"}
        title="Edit process"
        onClose={closeModal}
        footer={
          <>
            <button
              type="button"
              className="bb-admin-btn bb-admin-btn-outline"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bb-admin-btn"
              disabled={submitting || !editProcess.name.trim()}
              onClick={async () => {
                setModalErr(null);
                setSubmitting(true);
                try {
                  await patchJson(
                    `${API_URL}/admin/projects/${projectId}/processes/${editProcess.id}`,
                    { name: editProcess.name },
                  );
                  setMsg("Process updated.");
                  closeModal();
                  await load();
                } catch (e) {
                  setModalErr(e instanceof Error ? e.message : "Failed to update process");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        <label className="block text-sm">
          <span className="bb-admin-label">Process name</span>
          <input
            className="bb-admin-input"
            value={editProcess.name}
            onChange={(e) => setEditProcess({ ...editProcess, name: e.target.value })}
          />
        </label>
        {modalErr ? <div className="text-sm text-red-700 mt-4">{modalErr}</div> : null}
      </AdminModal>

      {/* Delete process modal */}
      <AdminModal
        open={modal === "deleteProcess" && processToDelete !== null}
        title="Delete process?"
        onClose={closeModal}
        footer={
          <>
            <button
              type="button"
              className="bb-admin-btn bb-admin-btn-outline"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bb-admin-btn"
              disabled={submitting}
              onClick={async () => {
                if (!processToDelete) return;
                setModalErr(null);
                setSubmitting(true);
                try {
                  await deleteJson(
                    `${API_URL}/admin/projects/${projectId}/processes/${processToDelete.id}`,
                  );
                  setMsg("Process deleted.");
                  closeModal();
                  await load();
                } catch (e) {
                  setModalErr(e instanceof Error ? e.message : "Failed to delete process");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Deleting…" : "Delete process"}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed">
          Are you sure you want to delete process{" "}
          <span className="bb-admin-cell-primary">{processToDelete?.name}</span>? This cannot be
          undone.
        </p>
        {modalErr ? <div className="text-sm text-red-700 mt-4">{modalErr}</div> : null}
      </AdminModal>

      {/* Add access modal */}
      <AdminModal
        open={modal === "addAccess"}
        title="Add access"
        description="Grant full project access, or select specific processes."
        wide
        onClose={closeModal}
        footer={
          <>
            <button
              type="button"
              className="bb-admin-btn bb-admin-btn-outline"
              onClick={closeModal}
            >
              Cancel
            </button>
            {accessForm.scope === "process" && accessForm.processIds.length > 0 ? (
              <button
                type="button"
                className="bb-admin-btn"
                disabled={submitting || !accessForm.userId || userHasProjectAccess}
                onClick={async () => {
                  setModalErr(null);
                  setSubmitting(true);
                  try {
                    const count = accessForm.processIds.length;
                    await postJson(`${API_URL}/admin/memberships/process/batch`, {
                      userId: accessForm.userId,
                      processIds: accessForm.processIds,
                    });
                    setAccessForm({ userId: "", scope: "project", processIds: [] });
                    setMsg(count === 1 ? "Added to process." : `Added to ${count} processes.`);
                    closeModal();
                    await load();
                  } catch (e) {
                    setModalErr(e instanceof Error ? e.message : "Failed to add access");
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting
                  ? "Saving…"
                  : accessForm.processIds.length === 1
                    ? "Add to process"
                    : `Add to ${accessForm.processIds.length} processes`}
              </button>
            ) : (
              <button
                type="button"
                className="bb-admin-btn"
                disabled={submitting || !accessForm.userId || userHasProjectAccess}
                onClick={async () => {
                  setModalErr(null);
                  setSubmitting(true);
                  try {
                    await postJson(`${API_URL}/admin/memberships/project`, {
                      userId: accessForm.userId,
                      projectId,
                    });
                    setAccessForm({ userId: "", scope: "project", processIds: [] });
                    setMsg("Added to project.");
                    closeModal();
                    await load();
                  } catch (e) {
                    setModalErr(e instanceof Error ? e.message : "Failed to add access");
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? "Saving…" : "Add to project"}
              </button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="bb-admin-label">User</span>
            <select
              className="bb-select"
              value={accessForm.userId}
              onChange={(e) =>
                setAccessForm({ ...accessForm, userId: e.target.value, processIds: [] })
              }
            >
              <option value="">Select user</option>
              {users.filter((u) => u.role !== "ADMIN").map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>

          <div className="block text-sm">
            <span className="bb-admin-label">Access type</span>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="accessScope"
                  checked={accessForm.scope === "project"}
                  onChange={() =>
                    setAccessForm({ ...accessForm, scope: "project", processIds: [] })
                  }
                />
                <span>Full project access</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="accessScope"
                  checked={accessForm.scope === "process"}
                  onChange={() =>
                    setAccessForm({ ...accessForm, scope: "process", processIds: [] })
                  }
                />
                <span>Specific processes</span>
              </label>
            </div>
          </div>

          {accessForm.scope === "process" ? (
            <div className="block text-sm">
              <span className="bb-admin-label">Processes</span>
              {!accessForm.userId ? (
                <p className="text-sm opacity-60 bb-admin-checklist-empty">
                  Select a user first.
                </p>
              ) : userHasProjectAccess ? (
                <p className="text-sm opacity-60 bb-admin-checklist-empty">
                  User already has full project access.
                </p>
              ) : project.processes.length === 0 ? (
                <p className="text-sm opacity-60 bb-admin-checklist-empty">
                  No processes in this project.
                </p>
              ) : availableProcesses.length === 0 ? (
                <p className="text-sm opacity-60 bb-admin-checklist-empty">
                  User is already added to all processes.
                </p>
              ) : (
                <div className="bb-admin-checklist">
                  {availableProcesses.map((pr) => (
                    <label key={pr.id} className="bb-admin-checklist-item">
                      <input
                        type="checkbox"
                        className="bb-admin-checkbox"
                        checked={accessForm.processIds.includes(pr.id)}
                        onChange={() => toggleAccessProcess(pr.id)}
                      />
                      <span>{pr.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {userHasProjectAccess ? (
            <p className="text-sm opacity-70 border-l-2 border-foreground pl-3">
              This user already has project access and can use all processes.
            </p>
          ) : null}
          {modalErr ? <div className="text-sm text-red-700">{modalErr}</div> : null}
        </div>
      </AdminModal>

      {/* Remove access modal */}
      <AdminModal
        open={modal === "removeAccess" && accessToRemove !== null}
        title="Remove access?"
        onClose={closeModal}
        footer={
          <>
            <button
              type="button"
              className="bb-admin-btn bb-admin-btn-outline"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bb-admin-btn"
              disabled={submitting}
              onClick={async () => {
                if (!accessToRemove) return;
                setModalErr(null);
                setSubmitting(true);
                try {
                  if (accessToRemove.scope === "project") {
                    await deleteJson(
                      `${API_URL}/admin/memberships/project/${projectId}/users/${accessToRemove.userId}`,
                    );
                    setMsg("Project access removed.");
                  } else {
                    await deleteJson(
                      `${API_URL}/admin/memberships/process/${accessToRemove.processId}/users/${accessToRemove.userId}`,
                    );
                    setMsg("Process access removed.");
                  }
                  closeModal();
                  await load();
                } catch (e) {
                  setModalErr(e instanceof Error ? e.message : "Failed to remove access");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Removing…" : "Remove access"}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed">
          Remove access for{" "}
          <span className="bb-admin-cell-primary">{accessToRemove?.userName}</span> (
          <span className="bb-admin-cell-secondary">{accessToRemove?.username}</span>)
          {accessToRemove?.scope === "project" ? (
            <> from all processes in this project</>
          ) : accessToRemove?.scope === "process" ? (
            <>
              {" "}
              from <span className="bb-admin-cell-primary">{accessToRemove.processName}</span>
            </>
          ) : null}
          ?
        </p>
        {modalErr ? <div className="text-sm text-red-700 mt-4">{modalErr}</div> : null}
      </AdminModal>

      {/* Delete task modal */}
      <AdminModal
        open={modal === "deleteTask" && taskToDelete !== null}
        title="Delete task?"
        onClose={closeModal}
        footer={
          <>
            <button
              type="button"
              className="bb-admin-btn bb-admin-btn-outline"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bb-admin-btn"
              disabled={submitting}
              onClick={async () => {
                if (!taskToDelete) return;
                setModalErr(null);
                setSubmitting(true);
                try {
                  await deleteJson(`${API_URL}/admin/tasks/${taskToDelete.id}`);
                  setMsg("Task deleted.");
                  closeModal();
                  await load();
                } catch (e) {
                  setModalErr(e instanceof Error ? e.message : "Failed to delete task");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Deleting…" : "Delete task"}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed">
          Are you sure you want to delete task{" "}
          <span className="bb-admin-cell-primary">{taskToDelete?.publicId} {taskToDelete?.title}</span>?
          {taskToDelete?.assignedTo ? (
            <> This task is assigned to <span className="bb-admin-cell-primary">{taskToDelete.assignedTo.name}</span>.</>
          ) : null}
          {" "}This will also remove all comments and activity logs. This cannot be undone.
        </p>
        {modalErr ? <div className="text-sm text-red-700 mt-4">{modalErr}</div> : null}
      </AdminModal>
    </main>
  );
}
