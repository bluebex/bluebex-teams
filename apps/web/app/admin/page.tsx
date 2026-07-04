"use client";

import { useEffect, useState } from "react";
import { AdminModal } from "@/components/AdminModal";
import { AdminIconButton, DeleteIcon, EditIcon } from "@/components/AdminIconButton";
import { formatFullName } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type ModalType = "user" | "editUser" | "deleteUser" | null;

type User = { id: string; username: string; name: string; role: "ADMIN" | "USER"; createdAt?: string };

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
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newUser, setNewUser] = useState({ username: "", password: "", name: "" });
  const [editUser, setEditUser] = useState({ id: "", username: "", name: "", password: "" });
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  async function load() {
    setErr(null);
    const u = await fetch(`${API_URL}/admin/users`, { credentials: "include" });
    if (u.status === 401) return (window.location.href = "/login");
    if (u.status === 403) return setErr("Admin only.");
    if (!u.ok) return setErr("Failed to load admin data");
    const ud = await u.json();
    setUsers(ud.users || []);
  }

  useEffect(() => {
    load();
  }, []);

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

  return (
    <main className="bb-container bb-page space-y-16">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-4">
          <h1 className="bb-admin-title">Users</h1>
          <p className="text-sm max-w-lg opacity-60 leading-relaxed">
            Manage team members.
          </p>
        </div>
        <div className="flex gap-8 text-sm">
          <div>
            <div className="bb-admin-label">Users</div>
            <div className="text-2xl font-medium mt-1 tabular-nums">{users.length}</div>
          </div>
        </div>
      </header>

      {err ? <div className="text-sm text-red-700 border-l-2 border-red-700 pl-3">{err}</div> : null}
      {msg ? (
        <div className="text-sm opacity-70 border-l-2 border-foreground pl-3">{msg}</div>
      ) : null}

      <section className="space-y-6 pb-8">
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
                          {u.role !== "ADMIN" ? (
                            <AdminIconButton
                              label="Delete user"
                              variant="danger"
                              onClick={() => openDeleteUser(u)}
                            >
                              <DeleteIcon />
                            </AdminIconButton>
                          ) : null}
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
    </main>
  );
}
