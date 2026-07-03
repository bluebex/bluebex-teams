"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminModal } from "@/components/AdminModal";
import { AdminIconButton, DeleteIcon, EditIcon } from "@/components/AdminIconButton";
import { formatFullName } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type ModalType =
  | "user"
  | "editUser"
  | "deleteUser"
  | "project"
  | "editProject"
  | "deleteProject"
  | "editProcess"
  | "deleteProcess"
  | "addProjectAccess"
  | "removeProjectAccess"
  | null;

type User = { id: string; username: string; name: string; role: "ADMIN" | "USER"; createdAt?: string };
type Project = { id: string; name: string; processes: { id: string; name: string }[] };
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

type AccessToRemove =
  | {
      scope: "project";
      userId: string;
      userName: string;
      username: string;
      projectId: string;
      projectName: string;
    }
  | {
      scope: "process";
      userId: string;
      userName: string;
      username: string;
      projectId: string;
      projectName: string;
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

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMemberships, setProjectMemberships] = useState<ProjectMembership[]>([]);
  const [processMemberships, setProcessMemberships] = useState<ProcessMembership[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newUser, setNewUser] = useState({ username: "", password: "", name: "" });
  const [editUser, setEditUser] = useState({ id: "", username: "", name: "", password: "" });
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [accessToRemove, setAccessToRemove] = useState<AccessToRemove | null>(null);
  const [newProject, setNewProject] = useState({ name: "" });
  const [newProcess, setNewProcess] = useState({ projectId: "", name: "" });
  const [editProject, setEditProject] = useState({ id: "", name: "" });
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [editProcess, setEditProcess] = useState({
    id: "",
    projectId: "",
    projectName: "",
    name: "",
  });
  const [processToDelete, setProcessToDelete] = useState<{
    id: string;
    name: string;
    projectId: string;
    projectName: string;
  } | null>(null);
  const [accessForm, setAccessForm] = useState({ userId: "", projectId: "", processIds: [] as string[] });

  async function load() {
    setErr(null);
    const [u, p, m] = await Promise.all([
      fetch(`${API_URL}/admin/users`, { credentials: "include" }),
      fetch(`${API_URL}/admin/projects`, { credentials: "include" }),
      fetch(`${API_URL}/admin/memberships`, { credentials: "include" }),
    ]);
    if (u.status === 401) return (window.location.href = "/login");
    if (u.status === 403 || p.status === 403 || m.status === 403) return setErr("Admin only.");
    if (!u.ok || !p.ok || !m.ok) return setErr("Failed to load admin data");
    const ud = await u.json();
    const pd = await p.json();
    const md = await m.json();
    setUsers(ud.users || []);
    setProjects(pd.projects || []);
    setProjectMemberships(md.projectMemberships || []);
    setProcessMemberships(md.processMemberships || []);
  }

  useEffect(() => {
    load();
  }, []);

  const accessProcesses = useMemo(() => {
    if (!accessForm.projectId) return [];
    return projects.find((p) => p.id === accessForm.projectId)?.processes ?? [];
  }, [accessForm.projectId, projects]);

  const userHasProjectAccess = useMemo(() => {
    if (!accessForm.userId || !accessForm.projectId) return false;
    return projectMemberships.some(
      (m) => m.userId === accessForm.userId && m.projectId === accessForm.projectId,
    );
  }, [accessForm.userId, accessForm.projectId, projectMemberships]);

  const existingProcessAccessIds = useMemo(
    () =>
      new Set(
        processMemberships
          .filter(
            (m) =>
              m.userId === accessForm.userId &&
              m.projectId === accessForm.projectId,
          )
          .map((m) => m.processId),
      ),
    [processMemberships, accessForm.userId, accessForm.projectId],
  );

  const availableAccessProcesses = useMemo(() => {
    if (userHasProjectAccess) return [];
    return accessProcesses.filter((pr) => !existingProcessAccessIds.has(pr.id));
  }, [userHasProjectAccess, accessProcesses, existingProcessAccessIds]);

  const totalProcesses = useMemo(
    () => projects.reduce((n, p) => n + p.processes.length, 0),
    [projects],
  );

  const totalProjectAccess = projectMemberships.length + processMemberships.length;

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
    setUserToDelete(null);
    setAccessToRemove(null);
    setProjectToDelete(null);
    setProcessToDelete(null);
  }

  function openAddUser() {
    setNewUser({ username: "", password: "", name: "" });
    openModal("user");
  }

  function openEditUser(user: User) {
    setEditUser({ id: user.id, username: user.username, name: user.name, password: "" });
    setUserToDelete(null);
    setModal("editUser");
    setModalErr(null);
    setErr(null);
    setMsg(null);
  }

  function openDeleteUser(user: User) {
    setUserToDelete(user);
    setModal("deleteUser");
    setModalErr(null);
    setErr(null);
    setMsg(null);
  }

  function openAddProjectAccess() {
    setAccessForm({ userId: "", projectId: "", processIds: [] });
    openModal("addProjectAccess");
  }

  function openRemoveProjectAccess(access: AccessToRemove) {
    setAccessToRemove(access);
    setModal("removeProjectAccess");
    setModalErr(null);
    setErr(null);
    setMsg(null);
  }

  function toggleAccessProcess(processId: string) {
    setAccessForm((current) => ({
      ...current,
      processIds: current.processIds.includes(processId)
        ? current.processIds.filter((id) => id !== processId)
        : [...current.processIds, processId],
    }));
  }

  function openEditProject(project: Project) {
    setEditProject({ id: project.id, name: project.name });
    setModal("editProject");
    setModalErr(null);
    setErr(null);
    setMsg(null);
  }

  function openDeleteProject(project: Project) {
    setProjectToDelete(project);
    setModal("deleteProject");
    setModalErr(null);
    setErr(null);
    setMsg(null);
  }

  function openEditProcess(project: Project, process: { id: string; name: string }) {
    setEditProcess({
      id: process.id,
      projectId: project.id,
      projectName: project.name,
      name: process.name,
    });
    setModal("editProcess");
    setModalErr(null);
    setErr(null);
    setMsg(null);
  }

  function openDeleteProcess(
    project: Project,
    process: { id: string; name: string },
  ) {
    setProcessToDelete({
      id: process.id,
      name: process.name,
      projectId: project.id,
      projectName: project.name,
    });
    setModal("deleteProcess");
    setModalErr(null);
    setErr(null);
    setMsg(null);
  }

  function renderProjectActions(project: Project) {
    return (
      <>
        <AdminIconButton label="Edit project" onClick={() => openEditProject(project)}>
          <EditIcon />
        </AdminIconButton>
        <AdminIconButton
          label="Delete project"
          variant="danger"
          onClick={() => openDeleteProject(project)}
        >
          <DeleteIcon />
        </AdminIconButton>
      </>
    );
  }

  function renderProcessActions(project: Project, process: { id: string; name: string }) {
    return (
      <>
        <AdminIconButton
          label="Edit process"
          onClick={() => openEditProcess(project, process)}
        >
          <EditIcon />
        </AdminIconButton>
        <AdminIconButton
          label="Delete process"
          variant="danger"
          onClick={() => openDeleteProcess(project, process)}
        >
          <DeleteIcon />
        </AdminIconButton>
      </>
    );
  }

  return (
    <main className="bb-container bb-page space-y-16">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-4">
          <Link
            className="bb-admin-label inline-block hover:opacity-70 transition-opacity"
            href="/"
          >
            ← Back to tasks
          </Link>
          <h1 className="bb-admin-title">Admin</h1>
          <p className="text-sm max-w-lg opacity-60 leading-relaxed">
            Manage people, projects, and access.
          </p>
        </div>
        <div className="flex gap-8 text-sm">
          <div>
            <div className="bb-admin-label">Users</div>
            <div className="text-2xl font-medium mt-1 tabular-nums">{users.length}</div>
          </div>
          <div>
            <div className="bb-admin-label">Projects</div>
            <div className="text-2xl font-medium mt-1 tabular-nums">{projects.length}</div>
          </div>
          <div>
            <div className="bb-admin-label">Project access</div>
            <div className="text-2xl font-medium mt-1 tabular-nums">{totalProjectAccess}</div>
          </div>
        </div>
      </header>

      {err ? <div className="text-sm text-red-700 border-l-2 border-red-700 pl-3">{err}</div> : null}
      {msg ? (
        <div className="text-sm opacity-70 border-l-2 border-foreground pl-3">{msg}</div>
      ) : null}

      <section className="space-y-6 pb-8">
        <div className="bb-admin-label">Lists</div>

        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-header">
            <h2 className="bb-admin-list-box-title">Users</h2>
            <span className="bb-admin-label">{users.length} total</span>
          </div>
          <div className="bb-admin-list-box-body">
            <table className="bb-admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Added</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="bb-admin-cell-empty">
                      No users yet.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td className="bb-admin-cell-primary">{u.name}</td>
                      <td className="bb-admin-cell-secondary">{u.username}</td>
                      <td>
                        <span className="bb-admin-badge">{u.role}</span>
                      </td>
                      <td className="bb-admin-cell-date">{formatDate(u.createdAt)}</td>
                      <td>
                        <div className="bb-admin-row-actions">
                          <AdminIconButton label="Edit user" onClick={() => openEditUser(u)}>
                            <EditIcon />
                          </AdminIconButton>
                          <AdminIconButton
                            label="Delete user"
                            variant="danger"
                            onClick={() => openDeleteUser(u)}
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
            <button type="button" className="bb-admin-btn" onClick={openAddUser}>
              Add user
            </button>
          </div>
        </div>

        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-header">
            <h2 className="bb-admin-list-box-title">Projects &amp; processes</h2>
            <span className="bb-admin-label">
              {projects.length} projects · {totalProcesses} processes
            </span>
          </div>
          <div className="bb-admin-list-box-body">
            <table className="bb-admin-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Process</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="bb-admin-cell-empty">
                      No projects yet.
                    </td>
                  </tr>
                ) : (
                  projects.flatMap((p) =>
                    p.processes.length === 0
                      ? [
                          <tr key={p.id}>
                            <td className="bb-admin-cell-primary">{p.name}</td>
                            <td className="bb-admin-cell-secondary">No processes</td>
                            <td>
                              <div className="bb-admin-row-actions">{renderProjectActions(p)}</div>
                            </td>
                          </tr>,
                        ]
                      : p.processes.map((pr, i) => (
                          <tr key={pr.id}>
                            <td className={i > 0 ? "bb-admin-cell-secondary" : "bb-admin-cell-primary"}>
                              {i === 0 ? p.name : ""}
                            </td>
                            <td className="bb-admin-cell-secondary">{pr.name}</td>
                            <td>
                              <div className="bb-admin-row-actions">
                                {i === 0 ? renderProjectActions(p) : null}
                                {renderProcessActions(p, pr)}
                              </div>
                            </td>
                          </tr>
                        )),
                  )
                )}
              </tbody>
            </table>
          </div>
          <div className="bb-admin-list-box-footer">
            <button type="button" className="bb-admin-btn" onClick={() => openModal("project")}>
              Add project or process
            </button>
          </div>
        </div>

        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-header">
            <h2 className="bb-admin-list-box-title">Project access</h2>
            <span className="bb-admin-label">{totalProjectAccess} total</span>
          </div>
          <div className="bb-admin-list-box-body">
            <table className="bb-admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Scope</th>
                  <th>Project</th>
                  <th>Process</th>
                  <th>Added</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {totalProjectAccess === 0 ? (
                  <tr>
                    <td colSpan={6} className="bb-admin-cell-empty">
                      No project access yet.
                    </td>
                  </tr>
                ) : (
                  <>
                    {projectMemberships.map((m) => (
                      <tr key={`p-${m.userId}-${m.projectId}`}>
                        <td className="bb-admin-cell-primary">
                          {m.userName}
                          <span className="bb-admin-cell-sub">{m.username}</span>
                        </td>
                        <td>
                          <span className="bb-admin-badge">Project</span>
                        </td>
                        <td className="bb-admin-cell-primary">{m.projectName}</td>
                        <td className="bb-admin-cell-secondary">All processes</td>
                        <td className="bb-admin-cell-date">{formatDate(m.createdAt)}</td>
                        <td>
                          <div className="bb-admin-row-actions">
                            <AdminIconButton
                              label="Remove access"
                              variant="danger"
                              onClick={() =>
                                openRemoveProjectAccess({
                                  scope: "project",
                                  userId: m.userId,
                                  userName: m.userName,
                                  username: m.username,
                                  projectId: m.projectId,
                                  projectName: m.projectName,
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
                        <td className="bb-admin-cell-primary">{m.projectName}</td>
                        <td className="bb-admin-cell-secondary">{m.processName}</td>
                        <td className="bb-admin-cell-date">{formatDate(m.createdAt)}</td>
                        <td>
                          <div className="bb-admin-row-actions">
                            <AdminIconButton
                              label="Remove access"
                              variant="danger"
                              onClick={() =>
                                openRemoveProjectAccess({
                                  scope: "process",
                                  userId: m.userId,
                                  userName: m.userName,
                                  username: m.username,
                                  projectId: m.projectId,
                                  projectName: m.projectName,
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
            <button type="button" className="bb-admin-btn" onClick={openAddProjectAccess}>
              Add project access
            </button>
          </div>
        </div>
      </section>

      <AdminModal
        open={modal === "user"}
        title="Add user"
        description="Username min 3 chars, password min 6 chars."
        onClose={closeModal}
        footer={
          <>
            <button type="button" className="bb-admin-btn bb-admin-btn-outline" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="bb-admin-btn"
              disabled={submitting}
              onClick={async () => {
                setModalErr(null);
                setSubmitting(true);
                try {
                  await postJson(`${API_URL}/admin/users`, newUser);
                  setNewUser({ username: "", password: "", name: "" });
                  setMsg("User created.");
                  closeModal();
                  await load();
                } catch (e) {
                  setModalErr(e instanceof Error ? e.message : "Failed to create user");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Saving…" : "Add user"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="bb-admin-label">Username</span>
            <input
              className="bb-admin-input"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="bb-admin-label">Full name</span>
            <input
              className="bb-admin-input"
              value={newUser.name}
              onChange={(e) =>
                setNewUser({ ...newUser, name: formatFullName(e.target.value) })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="bb-admin-label">Password</span>
            <input
              type="password"
              className="bb-admin-input"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
          </label>
          {modalErr ? <div className="text-sm text-red-700">{modalErr}</div> : null}
        </div>
      </AdminModal>

      <AdminModal
        open={modal === "editUser"}
        title="Edit user"
        description="Leave password blank to keep the current password."
        onClose={closeModal}
        footer={
          <>
            <button type="button" className="bb-admin-btn bb-admin-btn-outline" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="bb-admin-btn"
              disabled={submitting}
              onClick={async () => {
                setModalErr(null);
                setSubmitting(true);
                try {
                  const body: { username: string; name: string; password?: string } = {
                    username: editUser.username,
                    name: editUser.name,
                  };
                  if (editUser.password.trim()) {
                    body.password = editUser.password;
                  }
                  await patchJson(`${API_URL}/admin/users/${editUser.id}`, body);
                  setMsg("User updated.");
                  closeModal();
                  await load();
                } catch (e) {
                  setModalErr(e instanceof Error ? e.message : "Failed to update user");
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
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="bb-admin-label">Username</span>
            <input
              className="bb-admin-input"
              value={editUser.username}
              onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="bb-admin-label">Full name</span>
            <input
              className="bb-admin-input"
              value={editUser.name}
              onChange={(e) =>
                setEditUser({ ...editUser, name: formatFullName(e.target.value) })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="bb-admin-label">New password (optional)</span>
            <input
              type="password"
              className="bb-admin-input"
              value={editUser.password}
              onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
              placeholder="Leave blank to keep current"
            />
          </label>
          {modalErr ? <div className="text-sm text-red-700">{modalErr}</div> : null}
        </div>
      </AdminModal>

      <AdminModal
        open={modal === "deleteUser" && userToDelete !== null}
        title="Delete user?"
        onClose={closeModal}
        footer={
          <>
            <button type="button" className="bb-admin-btn bb-admin-btn-outline" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="bb-admin-btn"
              disabled={submitting}
              onClick={async () => {
                if (!userToDelete) return;
                setModalErr(null);
                setSubmitting(true);
                try {
                  await deleteJson(`${API_URL}/admin/users/${userToDelete.id}`);
                  setMsg("User deleted.");
                  closeModal();
                  await load();
                } catch (e) {
                  setModalErr(e instanceof Error ? e.message : "Failed to delete user");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Deleting…" : "Delete user"}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed">
          Are you sure you want to delete{" "}
          <span className="bb-admin-cell-primary">{userToDelete?.name}</span> (
          <span className="bb-admin-cell-secondary">{userToDelete?.username}</span>)? This cannot
          be undone.
        </p>
        {modalErr ? <div className="text-sm text-red-700 mt-4">{modalErr}</div> : null}
      </AdminModal>

      <AdminModal
        open={modal === "editProject"}
        title="Edit project"
        onClose={closeModal}
        footer={
          <>
            <button type="button" className="bb-admin-btn bb-admin-btn-outline" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="bb-admin-btn"
              disabled={submitting || !editProject.name.trim()}
              onClick={async () => {
                setModalErr(null);
                setSubmitting(true);
                try {
                  await patchJson(`${API_URL}/admin/projects/${editProject.id}`, {
                    name: editProject.name,
                  });
                  setMsg("Project updated.");
                  closeModal();
                  await load();
                } catch (e) {
                  setModalErr(e instanceof Error ? e.message : "Failed to update project");
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
          <span className="bb-admin-label">Project name</span>
          <input
            className="bb-admin-input"
            value={editProject.name}
            onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
          />
        </label>
        {modalErr ? <div className="text-sm text-red-700 mt-4">{modalErr}</div> : null}
      </AdminModal>

      <AdminModal
        open={modal === "deleteProject" && projectToDelete !== null}
        title="Delete project?"
        onClose={closeModal}
        footer={
          <>
            <button type="button" className="bb-admin-btn bb-admin-btn-outline" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="bb-admin-btn"
              disabled={submitting}
              onClick={async () => {
                if (!projectToDelete) return;
                setModalErr(null);
                setSubmitting(true);
                try {
                  await deleteJson(`${API_URL}/admin/projects/${projectToDelete.id}`);
                  setMsg("Project deleted.");
                  closeModal();
                  await load();
                } catch (e) {
                  setModalErr(e instanceof Error ? e.message : "Failed to delete project");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Deleting…" : "Delete project"}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed">
          Are you sure you want to delete project{" "}
          <span className="bb-admin-cell-primary">{projectToDelete?.name}</span>? This will also
          remove its processes and project access. This cannot be undone.
        </p>
        {modalErr ? <div className="text-sm text-red-700 mt-4">{modalErr}</div> : null}
      </AdminModal>

      <AdminModal
        open={modal === "editProcess"}
        title="Edit process"
        onClose={closeModal}
        footer={
          <>
            <button type="button" className="bb-admin-btn bb-admin-btn-outline" onClick={closeModal}>
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
                    `${API_URL}/admin/projects/${editProcess.projectId}/processes/${editProcess.id}`,
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
        <div className="space-y-4">
          <p className="text-sm opacity-70">
            Project: <span className="bb-admin-cell-primary">{editProcess.projectName}</span>
          </p>
          <label className="block text-sm">
            <span className="bb-admin-label">Process name</span>
            <input
              className="bb-admin-input"
              value={editProcess.name}
              onChange={(e) => setEditProcess({ ...editProcess, name: e.target.value })}
            />
          </label>
        </div>
        {modalErr ? <div className="text-sm text-red-700 mt-4">{modalErr}</div> : null}
      </AdminModal>

      <AdminModal
        open={modal === "deleteProcess" && processToDelete !== null}
        title="Delete process?"
        onClose={closeModal}
        footer={
          <>
            <button type="button" className="bb-admin-btn bb-admin-btn-outline" onClick={closeModal}>
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
                    `${API_URL}/admin/projects/${processToDelete.projectId}/processes/${processToDelete.id}`,
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
          <span className="bb-admin-cell-primary">{processToDelete?.name}</span> from{" "}
          <span className="bb-admin-cell-primary">{processToDelete?.projectName}</span>? This cannot
          be undone.
        </p>
        {modalErr ? <div className="text-sm text-red-700 mt-4">{modalErr}</div> : null}
      </AdminModal>

      <AdminModal
        open={modal === "project"}
        title="Add project or process"
        wide
        onClose={closeModal}
        footer={
          <button type="button" className="bb-admin-btn bb-admin-btn-outline" onClick={closeModal}>
            Close
          </button>
        }
      >
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="bb-admin-label">New project</div>
            <label className="block text-sm">
              <span className="opacity-70">Project name</span>
              <input
                className="bb-admin-input"
                value={newProject.name}
                onChange={(e) => setNewProject({ name: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="bb-admin-btn"
              disabled={submitting || !newProject.name.trim()}
              onClick={async () => {
                setModalErr(null);
                setSubmitting(true);
                try {
                  await postJson(`${API_URL}/admin/projects`, newProject);
                  setNewProject({ name: "" });
                  setMsg("Project created.");
                  closeModal();
                  await load();
                } catch (e) {
                  setModalErr(e instanceof Error ? e.message : "Failed to create project");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              Add project
            </button>
          </div>

          <div className="space-y-4 pt-6 border-t border-[var(--bb-line)]">
            <div className="bb-admin-label">New process</div>
            <label className="block text-sm">
              <span className="opacity-70">Project</span>
              <select
                className="bb-select"
                value={newProcess.projectId}
                onChange={(e) => setNewProcess({ ...newProcess, projectId: e.target.value })}
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
              <span className="opacity-70">Process name</span>
              <input
                className="bb-admin-input"
                value={newProcess.name}
                onChange={(e) => setNewProcess({ ...newProcess, name: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="bb-admin-btn"
              disabled={submitting || !newProcess.projectId || !newProcess.name.trim()}
              onClick={async () => {
                if (!newProcess.projectId) return;
                setModalErr(null);
                setSubmitting(true);
                try {
                  await postJson(
                    `${API_URL}/admin/projects/${newProcess.projectId}/processes`,
                    { name: newProcess.name },
                  );
                  setNewProcess({ projectId: "", name: "" });
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
              Add process
            </button>
          </div>
          {modalErr ? <div className="text-sm text-red-700">{modalErr}</div> : null}
        </div>
      </AdminModal>

      <AdminModal
        open={modal === "removeProjectAccess" && accessToRemove !== null}
        title="Remove access?"
        onClose={closeModal}
        footer={
          <>
            <button type="button" className="bb-admin-btn bb-admin-btn-outline" onClick={closeModal}>
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
                      `${API_URL}/admin/memberships/project/${accessToRemove.projectId}/users/${accessToRemove.userId}`,
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
          <span className="bb-admin-cell-secondary">{accessToRemove?.username}</span>) from{" "}
          {accessToRemove?.scope === "project" ? (
            <>
              all processes in{" "}
              <span className="bb-admin-cell-primary">{accessToRemove.projectName}</span>
            </>
          ) : accessToRemove?.scope === "process" ? (
            <>
              <span className="bb-admin-cell-primary">{accessToRemove.processName}</span> in{" "}
              <span className="bb-admin-cell-primary">{accessToRemove.projectName}</span>
            </>
          ) : null}
          ?
        </p>
        {modalErr ? <div className="text-sm text-red-700 mt-4">{modalErr}</div> : null}
      </AdminModal>

      <AdminModal
        open={modal === "addProjectAccess"}
        title="Add project access"
        description="Grant project access for all processes, or select specific processes only."
        wide
        onClose={closeModal}
        footer={
          <>
            <button type="button" className="bb-admin-btn bb-admin-btn-outline" onClick={closeModal}>
              Cancel
            </button>
            {accessForm.processIds.length > 0 ? (
              <button
                type="button"
                className="bb-admin-btn"
                disabled={
                  submitting ||
                  !accessForm.userId ||
                  accessForm.processIds.length === 0 ||
                  userHasProjectAccess
                }
                onClick={async () => {
                  setModalErr(null);
                  setSubmitting(true);
                  try {
                    const count = accessForm.processIds.length;
                    await postJson(`${API_URL}/admin/memberships/process/batch`, {
                      userId: accessForm.userId,
                      processIds: accessForm.processIds,
                    });
                    setAccessForm({ userId: "", projectId: "", processIds: [] });
                    setMsg(
                      count === 1 ? "Added to process." : `Added to ${count} processes.`,
                    );
                    closeModal();
                    await load();
                  } catch (e) {
                    setModalErr(e instanceof Error ? e.message : "Failed to add project access");
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
                disabled={
                  submitting ||
                  !accessForm.userId ||
                  !accessForm.projectId ||
                  userHasProjectAccess
                }
                onClick={async () => {
                  setModalErr(null);
                  setSubmitting(true);
                  try {
                    await postJson(`${API_URL}/admin/memberships/project`, {
                      userId: accessForm.userId,
                      projectId: accessForm.projectId,
                    });
                    setAccessForm({ userId: "", projectId: "", processIds: [] });
                    setMsg("Added to project.");
                    closeModal();
                    await load();
                  } catch (e) {
                    setModalErr(e instanceof Error ? e.message : "Failed to add project access");
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
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="bb-admin-label">Project</span>
            <select
              className="bb-select"
              value={accessForm.projectId}
              onChange={(e) =>
                setAccessForm({ ...accessForm, projectId: e.target.value, processIds: [] })
              }
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="block text-sm">
            <span className="bb-admin-label">Processes (optional)</span>
            <p className="text-xs opacity-60 mt-1 mb-3">
              Select one or more processes, or leave all unchecked to grant access to the entire
              project.
            </p>
            {!accessForm.projectId ? (
              <p className="text-sm opacity-60 bb-admin-checklist-empty">Select a project first.</p>
            ) : userHasProjectAccess ? (
              <p className="text-sm opacity-60 bb-admin-checklist-empty">
                User already has all process access for this project.
              </p>
            ) : accessProcesses.length === 0 ? (
              <p className="text-sm opacity-60 bb-admin-checklist-empty">No processes in this project.</p>
            ) : availableAccessProcesses.length === 0 ? (
              <p className="text-sm opacity-60 bb-admin-checklist-empty">
                User is already added to all processes in this project.
              </p>
            ) : (
              <div className="bb-admin-checklist">
                {availableAccessProcesses.map((pr) => (
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
          {userHasProjectAccess ? (
            <p className="text-sm opacity-70 border-l-2 border-foreground pl-3">
              This user already has project access and can use all processes. No need to add
              individual process access.
            </p>
          ) : null}
          {modalErr ? <div className="text-sm text-red-700">{modalErr}</div> : null}
        </div>
      </AdminModal>
    </main>
  );
}
