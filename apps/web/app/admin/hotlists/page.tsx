"use client";

import { useEffect, useState } from "react";
import { AdminModal } from "@/components/AdminModal";
import { AdminIconButton, DeleteIcon } from "@/components/AdminIconButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Hotlist = {
  id: string;
  hotlistId: string;
  name: string;
  createdAt: string;
  createdBy: { id: string; username: string; name: string };
  _count: { taskLinks: number };
};

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminHotlistsPage() {
  const [hotlists, setHotlists] = useState<Hotlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Hotlist | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/hotlists`, { credentials: "include" });
      if (res.status === 401) return (window.location.href = "/login");
      if (res.status === 403) return setErr("Admin only.");
      if (!res.ok) return setErr("Failed to load hotlists.");
      const data = await res.json().catch(() => ({}));
      setHotlists((data.hotlists || []) as Hotlist[]);
    } catch {
      setErr("Failed to load hotlists.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setModalErr(null);
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/admin/hotlists/${deleteTarget.hotlistId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setMsg("Hotlist deleted.");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "Failed to delete hotlist");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="bb-container bb-page space-y-16">
      <header className="space-y-4">
        <h1 className="bb-admin-title">Hotlists</h1>
        <p className="text-sm max-w-lg opacity-60 leading-relaxed">
          View and delete hotlists.
        </p>
      </header>

      {err ? <div className="text-sm text-red-700 border-l-2 border-red-700 pl-3">{err}</div> : null}
      {msg ? <div className="text-sm opacity-70 border-l-2 border-foreground pl-3">{msg}</div> : null}

      <section className="space-y-6 pb-8">
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-header">
            <h2 className="bb-admin-list-box-title">Hotlists</h2>
            <span className="bb-admin-label">{hotlists.length} total</span>
          </div>
          <div className="bb-admin-list-box-body">
            <table className="bb-admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Tasks</th>
                  <th>Created by</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="bb-admin-cell-empty">
                      Loading…
                    </td>
                  </tr>
                ) : hotlists.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="bb-admin-cell-empty">
                      No hotlists yet.
                    </td>
                  </tr>
                ) : (
                  hotlists.map((h) => (
                    <tr key={h.id}>
                      <td className="bb-admin-cell-primary">{h.name}</td>
                      <td className="bb-admin-cell-secondary">{h.hotlistId}</td>
                      <td className="bb-admin-cell-secondary tabular-nums">{h._count.taskLinks}</td>
                      <td className="bb-admin-cell-secondary">{h.createdBy?.name ?? "—"}</td>
                      <td className="bb-admin-cell-date">{formatDate(h.createdAt)}</td>
                      <td>
                        <div className="bb-admin-row-actions justify-end">
                          <AdminIconButton
                            label="Delete hotlist"
                            variant="danger"
                            onClick={() => {
                              setModalErr(null);
                              setDeleteTarget(h);
                            }}
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

      <AdminModal
        open={deleteTarget !== null}
        title="Delete Hotlist?"
        onClose={() => {
          if (deleting) return;
          setDeleteTarget(null);
          setModalErr(null);
        }}
        footer={
          <>
            <button
              type="button"
              className="bb-admin-btn bb-admin-btn-outline"
              disabled={deleting}
              onClick={() => {
                setDeleteTarget(null);
                setModalErr(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bb-admin-btn"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed">
          Are you sure you want to delete{" "}
          <span className="bb-admin-cell-primary">{deleteTarget?.name}</span>{" "}
          <span className="bb-admin-cell-secondary">({deleteTarget?.hotlistId})</span>? This will
          remove it from all tasks.
        </p>
        {modalErr ? <div className="text-sm text-red-700 mt-4">{modalErr}</div> : null}
      </AdminModal>
    </main>
  );
}

