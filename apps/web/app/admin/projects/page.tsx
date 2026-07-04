"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminModal } from "@/components/AdminModal";
import {
  AdminIconButton,
  DeleteIcon,
  EditIcon,
} from "@/components/AdminIconButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type User = {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "USER";
};

type Project = {
  id: string;
  name: string;
  description?: string;
  processes: { id: string; name: string }[];
  members: { user: User }[];
  _count: { tasks: number };
};

type ModalType = "create" | "edit" | "delete" | null;

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    memberIds: [] as string[],
  });
  const [editData, setEditData] = useState({ id: "", name: "", description: "" });
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [pRes, uRes] = await Promise.all([
        fetch(`${API_URL}/admin/projects`, { credentials: "include" }),
        fetch(`${API_URL}/admin/users`, { credentials: "include" }),
      ]);
      if (pRes.status === 401 || uRes.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (pRes.status === 403 || uRes.status === 403) {
        setErr("Admin only.");
        return;
      }
      if (!pRes.ok || !uRes.ok) {
        setErr("Failed to load data.");
        return;
      }
      const pData = await pRes.json();
      const uData = await uRes.json();
      setProjects(pData.projects || []);
      setUsers(uData.users || []);
    } catch {
      setErr("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openModal(type: ModalType) {
    setModal(type);
    setModalErr(null);
    setMsg(null);
  }

  function closeModal() {
    setModal(null);
    setModalErr(null);
    setSubmitting(false);
    setProjectToDelete(null);
  }

  function openCreate() {
    setNewProject({ name: "", description: "", memberIds: [] });
    openModal("create");
  }

  function openEdit(project: Project) {
    setEditData({
      id: project.id,
      name: project.name,
      description: project.description || "",
    });
    openModal("edit");
  }

  function openDelete(project: Project) {
    setProjectToDelete(project);
    openModal("delete");
  }

  function toggleMember(userId: string) {
    setNewProject((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter((id) => id !== userId)
        : [...prev.memberIds, userId],
    }));
  }

  async function handleCreate() {
    setModalErr(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin/projects`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProject.name,
          description: newProject.description || undefined,
          memberIds: newProject.memberIds,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setMsg("Project created.");
      closeModal();
      await load();
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    setModalErr(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin/projects/${editData.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editData.name,
          description: editData.description || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setMsg("Project updated.");
      closeModal();
      await load();
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "Failed to update project");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!projectToDelete) return;
    setModalErr(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin/projects/${projectToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setMsg("Project deleted.");
      closeModal();
      await load();
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "Failed to delete project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bb-container bb-page space-y-16">
      <header className="space-y-4">
        <h1 className="bb-admin-title">Projects</h1>
        <p className="text-sm max-w-lg opacity-60 leading-relaxed">
          Manage projects, processes, and access.
        </p>
      </header>

      {err && (
        <div className="text-sm text-red-700 border-l-2 border-red-700 pl-3">{err}</div>
      )}
      {msg && (
        <div className="text-sm opacity-70 border-l-2 border-foreground pl-3">{msg}</div>
      )}

      <section className="space-y-6 pb-8">
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-header">
            <h2 className="bb-admin-list-box-title">Projects</h2>
            <span className="bb-admin-label">{projects.length} total</span>
          </div>
          <div className="bb-admin-list-box-body">
            {loading ? (
              <p className="text-sm opacity-60 p-4">Loading projects…</p>
            ) : (
              <table className="bb-admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Processes</th>
                    <th>Members</th>
                    <th>Tasks</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="bb-admin-cell-empty">
                        No projects yet.
                      </td>
                    </tr>
                  ) : (
                    projects.map((project) => (
                      <tr
                        key={project.id}
                        className="cursor-pointer hover:bg-[var(--bb-line)]/30 transition-colors"
                        onClick={() => (window.location.href = `/admin/projects/${project.id}`)}
                      >
                        <td className="bb-admin-cell-primary">
                          <Link
                            href={`/admin/projects/${project.id}`}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {project.name}
                          </Link>
                        </td>
                        <td className="bb-admin-cell-secondary">
                          {project.description
                            ? project.description.length > 60
                              ? project.description.slice(0, 60) + "…"
                              : project.description
                            : "—"}
                        </td>
                        <td className="bb-admin-cell-secondary">{project.processes.length}</td>
                        <td className="bb-admin-cell-secondary">{project.members.length}</td>
                        <td className="bb-admin-cell-secondary">{project._count?.tasks ?? 0}</td>
                        <td>
                          <div
                            className="bb-admin-row-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AdminIconButton label="Edit project" onClick={() => openEdit(project)}>
                              <EditIcon />
                            </AdminIconButton>
                            <AdminIconButton
                              label="Delete project"
                              variant="danger"
                              onClick={() => openDelete(project)}
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
            )}
          </div>
          <div className="bb-admin-list-box-footer">
            <button type="button" className="bb-admin-btn" onClick={openCreate}>
              Add project
            </button>
          </div>
        </div>
      </section>

      {/* Create project modal */}
      <AdminModal
        open={modal === "create"}
        title="Add project"
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
            <button
              type="button"
              className="bb-admin-btn"
              disabled={submitting || !newProject.name.trim()}
              onClick={handleCreate}
            >
              {submitting ? "Creating…" : "Create project"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="bb-admin-label">Project name</span>
            <input
              className="bb-admin-input"
              value={newProject.name}
              onChange={(e) =>
                setNewProject({ ...newProject, name: e.target.value })
              }
              placeholder="Enter project name"
            />
          </label>
          <label className="block text-sm">
            <span className="bb-admin-label">Description (optional)</span>
            <textarea
              className="bb-admin-input bb-textarea"
              value={newProject.description}
              onChange={(e) =>
                setNewProject({ ...newProject, description: e.target.value })
              }
              placeholder="Enter project description"
              rows={3}
            />
          </label>
          <div className="block text-sm">
            <span className="bb-admin-label">Add people (optional)</span>
            {users.length === 0 ? (
              <p className="text-sm opacity-60 mt-2">No users available.</p>
            ) : (
              <div className="bb-admin-checklist mt-2">
                {users.filter((u) => u.role !== "ADMIN").map((user) => (
                  <label key={user.id} className="bb-admin-checklist-item">
                    <input
                      type="checkbox"
                      className="bb-admin-checkbox"
                      checked={newProject.memberIds.includes(user.id)}
                      onChange={() => toggleMember(user.id)}
                    />
                    <span>
                      {user.name}{" "}
                      <span className="opacity-50">@{user.username}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {modalErr && (
            <div className="text-sm text-red-700">{modalErr}</div>
          )}
        </div>
      </AdminModal>

      {/* Edit project modal */}
      <AdminModal
        open={modal === "edit"}
        title="Edit project"
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
              disabled={submitting || !editData.name.trim()}
              onClick={handleEdit}
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="bb-admin-label">Project name</span>
            <input
              className="bb-admin-input"
              value={editData.name}
              onChange={(e) =>
                setEditData({ ...editData, name: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="bb-admin-label">Description (optional)</span>
            <textarea
              className="bb-admin-input bb-textarea"
              value={editData.description}
              onChange={(e) =>
                setEditData({ ...editData, description: e.target.value })
              }
              rows={3}
            />
          </label>
          {modalErr && (
            <div className="text-sm text-red-700">{modalErr}</div>
          )}
        </div>
      </AdminModal>

      {/* Delete project modal */}
      <AdminModal
        open={modal === "delete" && projectToDelete !== null}
        title="Delete project?"
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
              onClick={handleDelete}
            >
              {submitting ? "Deleting…" : "Delete project"}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed">
          Are you sure you want to delete project{" "}
          <span className="bb-admin-cell-primary">{projectToDelete?.name}</span>?
          This will also remove its processes and access. This cannot be undone.
        </p>
        {modalErr && (
          <div className="text-sm text-red-700 mt-4">{modalErr}</div>
        )}
      </AdminModal>
    </main>
  );
}
